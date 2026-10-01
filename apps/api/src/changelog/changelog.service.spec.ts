import { Logger, NotFoundException } from "@nestjs/common";
import { ScheduleModule, SchedulerRegistry } from "@nestjs/schedule";
import { Test, TestingModule } from "@nestjs/testing";
import { Prisma } from "@prisma/client";

import { parseDateOnly, todayDateOnlyString } from "../common/utils/date.util";
import { PrismaService } from "../prisma/prisma.service";

import { ChangelogService, visibleTo } from "./changelog.service";

const SIGNED_UP = new Date("2026-09-01T10:00:00.000Z");

const buildEntry = (overrides: Partial<Record<string, unknown>> = {}) => ({
  id: "entry-1",
  title: "Relatórios chegaram",
  description: "Resumo do período,\ncategorias e evolução.",
  videoId: "dQw4w9WgXcQ",
  publishedAt: new Date("2026-09-29T12:00:00.000Z"),
  expiresAt: new Date("2026-12-31T00:00:00.000Z"),
  status: "ACTIVE",
  createdById: "admin-1",
  createdAt: new Date("2026-09-29T12:00:00.000Z"),
  updatedAt: new Date("2026-09-29T12:00:00.000Z"),
  ...overrides,
});

const buildAdminRow = (overrides: Partial<Record<string, unknown>> = {}) => ({
  ...buildEntry(),
  createdBy: { name: "Equipe Mony" },
  _count: { reads: 3 },
  ...overrides,
});

const notFound = () =>
  new Prisma.PrismaClientKnownRequestError("Record to update not found.", {
    code: "P2025",
    clientVersion: "5.20.0",
  });

const ADMIN_INCLUDE = {
  createdBy: { select: { name: true } },
  _count: { select: { reads: true } },
};
const NEWEST_FIRST = [{ publishedAt: "desc" }, { id: "asc" }];

type PrismaMock = {
  $transaction: jest.Mock;
  changelogEntry: {
    findMany: jest.Mock;
    findFirst: jest.Mock;
    count: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
    delete: jest.Mock;
    updateMany: jest.Mock;
  };
  changelogRead: { createMany: jest.Mock };
  user: { findUniqueOrThrow: jest.Mock };
};

const buildPrisma = (): PrismaMock => ({
  // The array form: resolves every query, in order.
  $transaction: jest.fn((queries: Array<Promise<unknown>>) => Promise.all(queries)),
  changelogEntry: {
    findMany: jest.fn(),
    findFirst: jest.fn(),
    count: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    updateMany: jest.fn(),
  },
  changelogRead: { createMany: jest.fn() },
  user: { findUniqueOrThrow: jest.fn().mockResolvedValue({ createdAt: SIGNED_UP }) },
});

describe("visibleTo", () => {
  it("is legacy's rule: active, not past its last day, published at or after signup", () => {
    expect(visibleTo(SIGNED_UP, "2026-09-30")).toEqual({
      status: "ACTIVE",
      OR: [{ expiresAt: null }, { expiresAt: { gte: new Date("2026-09-30T00:00:00.000Z") } }],
      publishedAt: { gte: SIGNED_UP },
    });
  });
});

describe("ChangelogService", () => {
  let service: ChangelogService;
  let prisma: PrismaMock;
  const today = () => todayDateOnlyString();

  beforeEach(async () => {
    prisma = buildPrisma();
    const module: TestingModule = await Test.createTestingModule({
      providers: [ChangelogService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    service = module.get(ChangelogService);
  });

  afterEach(() => jest.restoreAllMocks());

  describe("unread", () => {
    const unreadWhere = () => ({
      ...visibleTo(SIGNED_UP, today()),
      reads: { none: { userId: "user-1" } },
    });

    it("returns the newest visible entry this user hasn't read, and how many wait", async () => {
      prisma.changelogEntry.findFirst.mockResolvedValue(buildEntry());
      prisma.changelogEntry.count.mockResolvedValue(3);

      const unread = await service.unread("user-1");

      expect(prisma.user.findUniqueOrThrow).toHaveBeenCalledWith({
        where: { id: "user-1" },
        select: { createdAt: true },
      });
      // Both read in one transaction, with the same filter.
      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
      expect(prisma.changelogEntry.findFirst).toHaveBeenCalledWith({
        where: unreadWhere(),
        orderBy: NEWEST_FIRST,
      });
      expect(prisma.changelogEntry.count).toHaveBeenCalledWith({ where: unreadWhere() });
      expect(unread).toEqual({
        entry: {
          id: "entry-1",
          title: "Relatórios chegaram",
          description: "Resumo do período,\ncategorias e evolução.",
          videoId: "dQw4w9WgXcQ",
          publishedAt: "2026-09-29T12:00:00.000Z",
          expiresAt: "2026-12-31",
          readAt: null,
        },
        total: 3,
      });
    });

    it("sends null for an entry without video or expiry", async () => {
      prisma.changelogEntry.findFirst.mockResolvedValue(
        buildEntry({ videoId: null, expiresAt: null }),
      );
      prisma.changelogEntry.count.mockResolvedValue(1);

      const { entry } = await service.unread("user-1");

      expect(entry).toMatchObject({ videoId: null, expiresAt: null, readAt: null });
    });

    it("answers no entry and zero when everything's read", async () => {
      prisma.changelogEntry.findFirst.mockResolvedValue(null);
      prisma.changelogEntry.count.mockResolvedValue(0);

      await expect(service.unread("user-1")).resolves.toEqual({ entry: null, total: 0 });
    });
  });

  describe("history", () => {
    it("lists every visible entry with when this user read it", async () => {
      prisma.changelogEntry.findMany.mockResolvedValue([
        { ...buildEntry({ id: "new" }), reads: [] },
        { ...buildEntry({ id: "old" }), reads: [{ readAt: new Date("2026-09-30T08:00:00.000Z") }] },
      ]);

      const entries = await service.history("user-1");

      expect(prisma.changelogEntry.findMany).toHaveBeenCalledWith({
        where: visibleTo(SIGNED_UP, today()),
        include: { reads: { where: { userId: "user-1" }, select: { readAt: true } } },
        orderBy: NEWEST_FIRST,
      });
      expect(entries.map(({ id, readAt }) => ({ id, readAt }))).toEqual([
        { id: "new", readAt: null },
        { id: "old", readAt: "2026-09-30T08:00:00.000Z" },
      ]);
    });
  });

  describe("markRead", () => {
    it("records the read idempotently, keeping the first read time", async () => {
      prisma.changelogEntry.findFirst.mockResolvedValue({ id: "entry-1" });
      prisma.changelogRead.createMany.mockResolvedValue({ count: 1 });

      await service.markRead("user-1", "entry-1");

      expect(prisma.changelogEntry.findFirst).toHaveBeenCalledWith({
        where: { id: "entry-1", ...visibleTo(SIGNED_UP, today()) },
        select: { id: true },
      });
      // ON CONFLICT DO NOTHING: a second read (or a double tap) changes nothing.
      expect(prisma.changelogRead.createMany).toHaveBeenCalledWith({
        data: [{ entryId: "entry-1", userId: "user-1" }],
        skipDuplicates: true,
      });
    });

    it("succeeds when it was already read", async () => {
      prisma.changelogEntry.findFirst.mockResolvedValue({ id: "entry-1" });
      prisma.changelogRead.createMany.mockResolvedValue({ count: 0 });

      await expect(service.markRead("user-1", "entry-1")).resolves.toBeUndefined();
    });

    it("answers 404 for an entry the user can't see, recording nothing", async () => {
      prisma.changelogEntry.findFirst.mockResolvedValue(null);

      await expect(service.markRead("user-1", "hidden")).rejects.toBeInstanceOf(NotFoundException);
      expect(prisma.changelogRead.createMany).not.toHaveBeenCalled();
    });
  });

  describe("adminList", () => {
    it("returns every entry (no visibility filter), newest first, with readers and author", async () => {
      prisma.changelogEntry.findMany.mockResolvedValue([
        buildAdminRow({ id: "b", status: "INACTIVE" }),
        buildAdminRow({ id: "a", createdBy: null, _count: { reads: 0 }, expiresAt: null }),
      ]);

      const entries = await service.adminList();

      expect(prisma.changelogEntry.findMany).toHaveBeenCalledWith({
        include: ADMIN_INCLUDE,
        orderBy: NEWEST_FIRST,
      });
      expect(entries[0]).toEqual({
        id: "b",
        title: "Relatórios chegaram",
        description: "Resumo do período,\ncategorias e evolução.",
        videoId: "dQw4w9WgXcQ",
        publishedAt: "2026-09-29T12:00:00.000Z",
        expiresAt: "2026-12-31",
        status: "INACTIVE",
        readCount: 3,
        authorName: "Equipe Mony",
      });
      // The author's account is gone: the entry stays, without a name.
      expect(entries[1]).toMatchObject({ authorName: null, readCount: 0, expiresAt: null });
    });
  });

  describe("create", () => {
    it("publishes with the admin as author, keeping only the video id", async () => {
      prisma.changelogEntry.create.mockResolvedValue({
        ...buildEntry(),
        createdBy: { name: "Equipe Mony" },
      });

      const entry = await service.create("admin-1", {
        title: "Relatórios chegaram",
        description: "Resumo do período.",
        videoUrl: "https://www.youtube.com/shorts/dQw4w9WgXcQ",
        expiresAt: "2026-12-31",
      });

      expect(prisma.changelogEntry.create).toHaveBeenCalledWith({
        data: {
          title: "Relatórios chegaram",
          description: "Resumo do período.",
          videoId: "dQw4w9WgXcQ",
          expiresAt: new Date("2026-12-31T00:00:00.000Z"),
          createdById: "admin-1",
        },
        // Brand new: nobody has read it, so nothing to count.
        include: { createdBy: { select: { name: true } } },
      });
      expect(entry).toEqual({
        id: "entry-1",
        title: "Relatórios chegaram",
        description: "Resumo do período,\ncategorias e evolução.",
        videoId: "dQw4w9WgXcQ",
        publishedAt: "2026-09-29T12:00:00.000Z",
        expiresAt: "2026-12-31",
        status: "ACTIVE",
        readCount: 0,
        authorName: "Equipe Mony",
      });
    });

    it("leaves status and publication date to the database defaults (active, now)", async () => {
      prisma.changelogEntry.create.mockResolvedValue({ ...buildEntry(), createdBy: null });

      await service.create("admin-1", { title: "Título", description: "Texto" });

      const { data } = prisma.changelogEntry.create.mock.calls[0][0];
      expect(data).toEqual({
        title: "Título",
        description: "Texto",
        videoId: null,
        expiresAt: null,
        createdById: "admin-1",
      });
      expect(data).not.toHaveProperty("status");
      expect(data).not.toHaveProperty("publishedAt");
    });
  });

  describe("update", () => {
    it("changes only what was sent, never the publication date", async () => {
      prisma.changelogEntry.update.mockResolvedValue(buildAdminRow({ title: "Novo título" }));

      const entry = await service.update("entry-1", { title: "Novo título" });

      const { where, data } = prisma.changelogEntry.update.mock.calls[0][0];
      expect(where).toEqual({ id: "entry-1" });
      // Prisma ignores undefined fields; video and expiry aren't touched.
      expect(data).toEqual({ title: "Novo título", description: undefined, status: undefined });
      expect(data).not.toHaveProperty("videoId");
      expect(data).not.toHaveProperty("expiresAt");
      expect(data).not.toHaveProperty("publishedAt");
      expect(entry.title).toBe("Novo título");
    });

    it("clears the video and the expiry with null", async () => {
      prisma.changelogEntry.update.mockResolvedValue(buildAdminRow());

      await service.update("entry-1", { videoUrl: null, expiresAt: null });

      expect(prisma.changelogEntry.update.mock.calls[0][0].data).toMatchObject({
        videoId: null,
        expiresAt: null,
      });
    });

    it("stores a new video's id, a new expiry and the status", async () => {
      prisma.changelogEntry.update.mockResolvedValue(buildAdminRow());

      await service.update("entry-1", {
        videoUrl: "https://youtu.be/abcdefghijk",
        expiresAt: "2027-01-31",
        status: "INACTIVE",
      });

      expect(prisma.changelogEntry.update.mock.calls[0][0].data).toMatchObject({
        videoId: "abcdefghijk",
        expiresAt: new Date("2027-01-31T00:00:00.000Z"),
        status: "INACTIVE",
      });
    });

    it("answers 404 for a missing entry", async () => {
      prisma.changelogEntry.update.mockRejectedValue(notFound());

      await expect(service.update("missing", { title: "x" })).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it("lets any other database error through", async () => {
      const failure = new Error("connection lost");
      prisma.changelogEntry.update.mockRejectedValue(failure);

      await expect(service.update("entry-1", { title: "x" })).rejects.toBe(failure);
    });
  });

  describe("delete", () => {
    it("deletes by id (its reads go with it, by cascade)", async () => {
      prisma.changelogEntry.delete.mockResolvedValue(buildEntry());

      await service.delete("entry-1");

      expect(prisma.changelogEntry.delete).toHaveBeenCalledWith({ where: { id: "entry-1" } });
    });

    it("answers 404 for a missing entry", async () => {
      prisma.changelogEntry.delete.mockRejectedValue(notFound());

      await expect(service.delete("missing")).rejects.toBeInstanceOf(NotFoundException);
    });

    it("lets any other database error through", async () => {
      const failure = new Prisma.PrismaClientKnownRequestError("Foreign key failed", {
        code: "P2003",
        clientVersion: "5.20.0",
      });
      prisma.changelogEntry.delete.mockRejectedValue(failure);

      await expect(service.delete("entry-1")).rejects.toBe(failure);
    });
  });

  describe("expireOld", () => {
    it("deactivates active entries whose last day is before today, and logs it", async () => {
      prisma.changelogEntry.updateMany.mockResolvedValue({ count: 2 });
      const log = jest.spyOn(Logger.prototype, "log").mockImplementation(() => undefined);

      await expect(service.expireOld("2026-09-30")).resolves.toBe(2);

      expect(prisma.changelogEntry.updateMany).toHaveBeenCalledWith({
        // `lt` today: the expiry day itself still counts.
        where: { status: "ACTIVE", expiresAt: { lt: new Date("2026-09-30T00:00:00.000Z") } },
        data: { status: "INACTIVE" },
      });
      expect(log).toHaveBeenCalledWith("Deactivated 2 expired changelog entries.");
    });

    it("stays quiet when nothing expired", async () => {
      prisma.changelogEntry.updateMany.mockResolvedValue({ count: 0 });
      const log = jest.spyOn(Logger.prototype, "log").mockImplementation(() => undefined);

      await expect(service.expireOld("2026-09-30")).resolves.toBe(0);

      expect(log).not.toHaveBeenCalled();
    });
  });

  describe("runExpirySweep", () => {
    it("sweeps against today (UTC)", async () => {
      prisma.changelogEntry.updateMany.mockResolvedValue({ count: 1 });
      jest.spyOn(Logger.prototype, "log").mockImplementation(() => undefined);

      await expect(service.runExpirySweep()).resolves.toBe(1);

      expect(prisma.changelogEntry.updateMany.mock.calls[0][0].where.expiresAt).toEqual({
        lt: parseDateOnly(today()),
      });
    });
  });
});

// The real scheduler wiring: the job is registered daily at 00:05 UTC and a
// tick (which calls the method with whatever arguments the cron library
// passes) still sweeps against today's date.
describe("ChangelogService expiry job (scheduled)", () => {
  let module: TestingModule;
  let prisma: PrismaMock;

  beforeEach(async () => {
    prisma = buildPrisma();
    prisma.changelogEntry.updateMany.mockResolvedValue({ count: 0 });
    module = await Test.createTestingModule({
      imports: [ScheduleModule.forRoot()],
      providers: [ChangelogService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    await module.init();
  });

  afterEach(async () => {
    await module.close();
  });

  it("runs daily at 00:05 UTC and sweeps against today", async () => {
    const job = module.get(SchedulerRegistry).getCronJob("changelog-expiry");
    expect(job.cronTime.source).toBe("5 0 * * *");
    expect(job.cronTime.timeZone).toBe("UTC");

    const expected = parseDateOnly(todayDateOnlyString());
    await job.fireOnTick();
    await new Promise((resolve) => setImmediate(resolve));

    expect(prisma.changelogEntry.updateMany).toHaveBeenCalledWith({
      where: { status: "ACTIVE", expiresAt: { lt: expected } },
      data: { status: "INACTIVE" },
    });
  });
});
