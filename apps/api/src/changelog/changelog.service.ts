import { youtubeVideoId } from "@mony/shared-types";
import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { Cron } from "@nestjs/schedule";
import { Prisma, type ChangelogEntry } from "@prisma/client";

import { parseDateOnly, toDateOnlyString, todayDateOnlyString } from "../common/utils/date.util";
import { PrismaService } from "../prisma/prisma.service";

import type {
  AdminChangelogEntryDto,
  ChangelogEntryDto,
  ChangelogUnreadDto,
  CreateChangelogDto,
  UpdateChangelogDto,
} from "./dto/changelog.dto";

// Legacy's rule for what a user sees: active, not expired (the expiry day
// itself still counts) and published at or after they signed up.
export function visibleTo(userCreatedAt: Date, today: string): Prisma.ChangelogEntryWhereInput {
  return {
    status: "ACTIVE",
    OR: [{ expiresAt: null }, { expiresAt: { gte: parseDateOnly(today) } }],
    publishedAt: { gte: userCreatedAt },
  };
}

const toEntryDto = (entry: ChangelogEntry, readAt: Date | null): ChangelogEntryDto => ({
  id: entry.id,
  title: entry.title,
  description: entry.description,
  videoId: entry.videoId,
  publishedAt: entry.publishedAt.toISOString(),
  expiresAt: entry.expiresAt ? toDateOnlyString(entry.expiresAt) : null,
  readAt: readAt?.toISOString() ?? null,
});

type AdminRow = ChangelogEntry & {
  createdBy: { name: string } | null;
  _count: { reads: number };
};

const toAdminDto = (entry: AdminRow): AdminChangelogEntryDto => ({
  id: entry.id,
  title: entry.title,
  description: entry.description,
  videoId: entry.videoId,
  publishedAt: entry.publishedAt.toISOString(),
  expiresAt: entry.expiresAt ? toDateOnlyString(entry.expiresAt) : null,
  status: entry.status,
  readCount: entry._count.reads,
  authorName: entry.createdBy?.name ?? null,
});

const ADMIN_INCLUDE = {
  createdBy: { select: { name: true } },
  _count: { select: { reads: true } },
} as const;

// "Novidades" (docs/specs/changelog).
@Injectable()
export class ChangelogService {
  private readonly logger = new Logger(ChangelogService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ---------------------------------------------------------------- users

  // The newest visible entry the user hasn't read, and how many there are
  // (legacy shows one on the dashboard and says how many more wait).
  async unread(userId: string): Promise<ChangelogUnreadDto> {
    const where: Prisma.ChangelogEntryWhereInput = {
      ...visibleTo(await this.signedUpAt(userId), todayDateOnlyString()),
      reads: { none: { userId } },
    };
    const [newest, total] = await this.prisma.$transaction([
      this.prisma.changelogEntry.findFirst({
        where,
        orderBy: [{ publishedAt: "desc" }, { id: "asc" }],
      }),
      this.prisma.changelogEntry.count({ where }),
    ]);
    return { entry: newest ? toEntryDto(newest, null) : null, total };
  }

  // Every visible entry, newest first, with when this user read it.
  async history(userId: string): Promise<ChangelogEntryDto[]> {
    const entries = await this.prisma.changelogEntry.findMany({
      where: visibleTo(await this.signedUpAt(userId), todayDateOnlyString()),
      include: { reads: { where: { userId }, select: { readAt: true } } },
      orderBy: [{ publishedAt: "desc" }, { id: "asc" }],
    });
    return entries.map((entry) => toEntryDto(entry, entry.reads[0]?.readAt ?? null));
  }

  // Idempotent: a second call (or a double tap) keeps the first read time
  // (INSERT … ON CONFLICT DO NOTHING).
  async markRead(userId: string, entryId: string): Promise<void> {
    const visible = await this.prisma.changelogEntry.findFirst({
      where: {
        id: entryId,
        ...visibleTo(await this.signedUpAt(userId), todayDateOnlyString()),
      },
      select: { id: true },
    });
    if (!visible) throw new NotFoundException("Changelog entry not found.");
    await this.prisma.changelogRead.createMany({
      data: [{ entryId, userId }],
      skipDuplicates: true,
    });
  }

  // ---------------------------------------------------------------- admins

  async adminList(): Promise<AdminChangelogEntryDto[]> {
    const entries = await this.prisma.changelogEntry.findMany({
      include: ADMIN_INCLUDE,
      orderBy: [{ publishedAt: "desc" }, { id: "asc" }],
    });
    return entries.map(toAdminDto);
  }

  // Published now, active, by the calling admin (legacy publishes on save).
  async create(adminId: string, dto: CreateChangelogDto): Promise<AdminChangelogEntryDto> {
    const entry = await this.prisma.changelogEntry.create({
      data: {
        title: dto.title,
        description: dto.description,
        videoId: dto.videoUrl ? youtubeVideoId(dto.videoUrl) : null,
        expiresAt: dto.expiresAt ? parseDateOnly(dto.expiresAt) : null,
        createdById: adminId,
      },
      // Nobody has read it yet: no need to count.
      include: { createdBy: ADMIN_INCLUDE.createdBy },
    });
    return toAdminDto({ ...entry, _count: { reads: 0 } });
  }

  // The publication date never changes; null clears the video / expiry.
  async update(id: string, dto: UpdateChangelogDto): Promise<AdminChangelogEntryDto> {
    const data: Prisma.ChangelogEntryUpdateInput = {
      title: dto.title,
      description: dto.description,
      status: dto.status,
    };
    if (dto.videoUrl !== undefined) {
      data.videoId = dto.videoUrl ? youtubeVideoId(dto.videoUrl) : null;
    }
    if (dto.expiresAt !== undefined) {
      data.expiresAt = dto.expiresAt ? parseDateOnly(dto.expiresAt) : null;
    }
    try {
      const entry = await this.prisma.changelogEntry.update({
        where: { id },
        data,
        include: ADMIN_INCLUDE,
      });
      return toAdminDto(entry);
    } catch (error) {
      throw this.notFoundOr(error);
    }
  }

  // Its read records go with it (cascade).
  async delete(id: string): Promise<void> {
    try {
      await this.prisma.changelogEntry.delete({ where: { id } });
    } catch (error) {
      throw this.notFoundOr(error);
    }
  }

  // ---------------------------------------------------------------- job

  // Legacy's limparAtualizacoesExpiradas, which nothing ever called there:
  // expired entries become INACTIVE once a day. Reads filter by expiry
  // anyway, so a missed run never shows an expired entry. "Today" is the
  // UTC date, like every visibility check, so the job runs at 00:05 UTC.
  @Cron("5 0 * * *", { name: "changelog-expiry", timeZone: "UTC" })
  runExpirySweep(): Promise<number> {
    return this.expireOld(todayDateOnlyString());
  }

  async expireOld(today: string): Promise<number> {
    const { count } = await this.prisma.changelogEntry.updateMany({
      where: { status: "ACTIVE", expiresAt: { lt: parseDateOnly(today) } },
      data: { status: "INACTIVE" },
    });
    if (count > 0)
      this.logger.log(`Deactivated ${count} expired changelog entr${count === 1 ? "y" : "ies"}.`);
    return count;
  }

  private async signedUpAt(userId: string): Promise<Date> {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { createdAt: true },
    });
    return user.createdAt;
  }

  private notFoundOr(error: unknown): unknown {
    return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025"
      ? new NotFoundException("Changelog entry not found.")
      : error;
  }
}
