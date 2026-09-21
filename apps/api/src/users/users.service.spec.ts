import { BadRequestException, ConflictException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import * as bcrypt from "bcryptjs";

import { PrismaService } from "../prisma/prisma.service";

import { ChangePasswordDto } from "./dto/change-password.dto";
import { SwitchWorkspaceDto } from "./dto/switch-workspace.dto";
import { UpdateProfileDto } from "./dto/update-profile.dto";
import { UsersService } from "./users.service";

describe("UsersService", () => {
  let service: UsersService;
  let prisma: { user: { findUniqueOrThrow: jest.Mock; findUnique: jest.Mock; update: jest.Mock } };

  const buildUser = async (overrides: Partial<Record<string, unknown>> = {}) => ({
    id: "user-1",
    name: "Ada Lovelace",
    email: "ada@example.com",
    phone: null,
    phone2: null,
    passwordHash: await bcrypt.hash("correcthorsebattery", 4),
    role: "USER",
    status: "ACTIVE",
    activeWorkspace: "PERSONAL",
    createdAt: new Date("2026-01-15T12:00:00.000Z"),
    lastAccessAt: null,
    ...overrides,
  });

  beforeEach(async () => {
    prisma = {
      user: {
        findUniqueOrThrow: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [UsersService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get(UsersService);
  });

  describe("getProfile", () => {
    it("returns the profile shape with ISO date strings", async () => {
      prisma.user.findUniqueOrThrow.mockResolvedValue(await buildUser());

      const result = await service.getProfile("user-1");

      expect(result).toEqual({
        id: "user-1",
        name: "Ada Lovelace",
        email: "ada@example.com",
        phone: null,
        phone2: null,
        activeWorkspace: "PERSONAL",
        createdAt: "2026-01-15T12:00:00.000Z",
        lastAccessAt: null,
      });
    });
  });

  describe("updateProfile", () => {
    const dto: UpdateProfileDto = { name: "Ada L.", phone: "11987654321" };

    it("updates the profile when no email conflict exists", async () => {
      prisma.user.update.mockResolvedValue(await buildUser({ name: "Ada L.", phone: "11987654321" }));

      const result = await service.updateProfile("user-1", dto);

      expect(prisma.user.findUnique).not.toHaveBeenCalled();
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: "user-1" },
        data: { name: "Ada L.", email: undefined, phone: "11987654321", phone2: undefined },
      });
      expect(result.name).toBe("Ada L.");
    });

    it("allows changing email when it is unused", async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.user.update.mockResolvedValue(await buildUser({ email: "new@example.com" }));

      const result = await service.updateProfile("user-1", { email: "new@example.com" });

      expect(result.email).toBe("new@example.com");
    });

    it("allows keeping the same email (no self-conflict)", async () => {
      const user = await buildUser();
      prisma.user.findUnique.mockResolvedValue(user);
      prisma.user.update.mockResolvedValue(user);

      await expect(service.updateProfile("user-1", { email: user.email })).resolves.toBeDefined();
    });

    it("rejects when the email is already used by another account", async () => {
      prisma.user.findUnique.mockResolvedValue({ id: "other-user", email: "taken@example.com" });

      await expect(
        service.updateProfile("user-1", { email: "taken@example.com" }),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(prisma.user.update).not.toHaveBeenCalled();
    });
  });

  describe("changePassword", () => {
    const dto: ChangePasswordDto = {
      currentPassword: "correcthorsebattery",
      newPassword: "new-correct-horse",
      newPasswordConfirmation: "new-correct-horse",
    };

    it("updates the password hash on a correct current password", async () => {
      prisma.user.findUniqueOrThrow.mockResolvedValue(await buildUser());

      await service.changePassword("user-1", dto);

      const updateArgs = prisma.user.update.mock.calls[0][0];
      expect(updateArgs.where).toEqual({ id: "user-1" });
      await expect(
        bcrypt.compare(dto.newPassword, updateArgs.data.passwordHash),
      ).resolves.toBe(true);
    });

    it("rejects with 400 when the current password is wrong", async () => {
      prisma.user.findUniqueOrThrow.mockResolvedValue(await buildUser());

      await expect(
        service.changePassword("user-1", { ...dto, currentPassword: "wrong-password" }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(prisma.user.update).not.toHaveBeenCalled();
    });
  });

  describe("switchWorkspace", () => {
    const dto: SwitchWorkspaceDto = { workspace: "BUSINESS" };

    it("persists the new active workspace", async () => {
      prisma.user.update.mockResolvedValue(await buildUser({ activeWorkspace: "BUSINESS" }));

      const result = await service.switchWorkspace("user-1", dto);

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: "user-1" },
        data: { activeWorkspace: "BUSINESS" },
      });
      expect(result.activeWorkspace).toBe("BUSINESS");
    });
  });
});
