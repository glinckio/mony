import { BadRequestException, ConflictException, Injectable } from "@nestjs/common";
import type { User } from "@prisma/client";
import * as bcrypt from "bcryptjs";

import { PrismaService } from "../prisma/prisma.service";

import { ChangePasswordDto } from "./dto/change-password.dto";
import { ProfileDto } from "./dto/profile.dto";
import { SwitchWorkspaceDto } from "./dto/switch-workspace.dto";
import { UpdateProfileDto } from "./dto/update-profile.dto";

const BCRYPT_SALT_ROUNDS = 12;

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async getProfile(userId: string): Promise<ProfileDto> {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    return this.toProfileDto(user);
  }

  async updateProfile(userId: string, dto: UpdateProfileDto): Promise<ProfileDto> {
    if (dto.email) {
      const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
      if (existing && existing.id !== userId) {
        throw new ConflictException("This email is already registered.");
      }
    }

    const user = await this.prisma.user.update({
      where: { id: userId },
      data: {
        name: dto.name,
        email: dto.email,
        phone: dto.phone,
        phone2: dto.phone2,
      },
    });

    return this.toProfileDto(user);
  }

  async changePassword(userId: string, dto: ChangePasswordDto): Promise<void> {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });

    const currentMatches = await bcrypt.compare(dto.currentPassword, user.passwordHash);
    if (!currentMatches) {
      // 400, not 401: this is a business-rule validation failure on an
      // already-authenticated request, not an auth failure — matches
      // the password-reset-confirm precedent (auth.service.ts). A 401
      // here would make api-client.ts's silent-refresh-on-401 logic
      // fire an unnecessary /auth/refresh on every wrong-password
      // submission.
      throw new BadRequestException("Current password is incorrect.");
    }

    const passwordHash = await bcrypt.hash(dto.newPassword, BCRYPT_SALT_ROUNDS);
    await this.prisma.user.update({ where: { id: userId }, data: { passwordHash } });
  }

  async switchWorkspace(userId: string, dto: SwitchWorkspaceDto): Promise<ProfileDto> {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: { activeWorkspace: dto.workspace },
    });

    return this.toProfileDto(user);
  }

  private toProfileDto(user: User): ProfileDto {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      phone2: user.phone2,
      activeWorkspace: user.activeWorkspace,
      createdAt: user.createdAt.toISOString(),
      lastAccessAt: user.lastAccessAt?.toISOString() ?? null,
    };
  }
}
