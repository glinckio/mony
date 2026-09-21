import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { Test, TestingModule } from "@nestjs/testing";
import * as bcrypt from "bcryptjs";

import { MailerService } from "../common/mailer/mailer.service";
import { PrismaService } from "../prisma/prisma.service";

import { AuthService } from "./auth.service";
import { ConfirmResetDto } from "./dto/confirm-reset.dto";
import { LoginDto } from "./dto/login.dto";
import { RefreshDto } from "./dto/refresh.dto";
import { RegisterDto } from "./dto/register.dto";
import { RequestResetDto } from "./dto/request-reset.dto";

describe("AuthService", () => {
  let service: AuthService;
  let prisma: {
    user: { findUnique: jest.Mock; create: jest.Mock; update: jest.Mock };
    passwordResetCode: {
      updateMany: jest.Mock;
      create: jest.Mock;
      findFirst: jest.Mock;
      update: jest.Mock;
    };
    $transaction: jest.Mock;
  };
  let jwt: { signAsync: jest.Mock; verifyAsync: jest.Mock };
  let mailer: { sendPasswordResetCode: jest.Mock };

  const registerDto: RegisterDto = {
    name: "Ada Lovelace",
    email: "ada@example.com",
    password: "correcthorsebattery",
    passwordConfirmation: "correcthorsebattery",
  };

  const buildUser = async (overrides: Partial<Record<string, unknown>> = {}) => ({
    id: "user-1",
    name: "Ada Lovelace",
    email: "ada@example.com",
    passwordHash: await bcrypt.hash("correcthorsebattery", 4),
    role: "USER",
    status: "ACTIVE",
    activeWorkspace: "PERSONAL",
    ...overrides,
  });

  beforeEach(async () => {
    prisma = {
      user: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      passwordResetCode: {
        updateMany: jest.fn(),
        create: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
      },
      $transaction: jest.fn(),
    };
    // Supports both the array style ($transaction([op1, op2])) and the
    // interactive callback style ($transaction(async (tx) => {...})) used
    // by confirmPasswordReset — the callback is invoked with `prisma`
    // itself, since it exposes the same mocked methods a real `tx` would.
    prisma.$transaction.mockImplementation((arg: unknown) =>
      typeof arg === "function" ? arg(prisma) : Promise.all(arg as Promise<unknown>[]),
    );
    jwt = {
      signAsync: jest.fn().mockResolvedValue("signed-token"),
      verifyAsync: jest.fn(),
    };
    mailer = { sendPasswordResetCode: jest.fn().mockResolvedValue(undefined) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prisma },
        { provide: JwtService, useValue: jwt },
        {
          provide: ConfigService,
          useValue: { get: jest.fn().mockReturnValue("config-value") },
        },
        { provide: MailerService, useValue: mailer },
      ],
    }).compile();

    service = module.get(AuthService);
  });

  describe("register", () => {
    it("creates a user with a bcrypt-hashed password and returns tokens", async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.user.create.mockResolvedValue(await buildUser());

      const result = await service.register(registerDto);

      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: registerDto.email },
      });
      const createArgs = prisma.user.create.mock.calls[0][0];
      expect(createArgs.data.email).toBe(registerDto.email);
      expect(createArgs.data.passwordHash).not.toBe(registerDto.password);
      await expect(
        bcrypt.compare(registerDto.password, createArgs.data.passwordHash),
      ).resolves.toBe(true);

      expect(jwt.signAsync).toHaveBeenCalledTimes(2);
      expect(result).toEqual({
        accessToken: "signed-token",
        refreshToken: "signed-token",
        user: {
          id: "user-1",
          name: registerDto.name,
          email: registerDto.email,
          activeWorkspace: "PERSONAL",
        },
      });
    });

    it("rejects registration when the email is already taken", async () => {
      prisma.user.findUnique.mockResolvedValue({ id: "existing-user" });

      await expect(service.register(registerDto)).rejects.toBeInstanceOf(ConflictException);
      expect(prisma.user.create).not.toHaveBeenCalled();
    });
  });

  describe("login", () => {
    const loginDto: LoginDto = { email: "ada@example.com", password: "correcthorsebattery" };

    it("returns tokens and updates lastAccessAt on success", async () => {
      const user = await buildUser();
      prisma.user.findUnique.mockResolvedValue(user);

      const result = await service.login(loginDto);

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: user.id },
        data: { lastAccessAt: expect.any(Date) },
      });
      expect(result.accessToken).toBe("signed-token");
      expect(result.user.email).toBe(user.email);
    });

    it("rejects an unknown email with a generic message", async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException);
      await expect(service.login(loginDto)).rejects.toThrow("Incorrect email or password.");
    });

    it("rejects a wrong password with the same generic message", async () => {
      prisma.user.findUnique.mockResolvedValue(await buildUser());

      await expect(
        service.login({ email: "ada@example.com", password: "wrong-password" }),
      ).rejects.toThrow("Incorrect email or password.");
    });

    it("rejects an inactive account with 403", async () => {
      prisma.user.findUnique.mockResolvedValue(await buildUser({ status: "INACTIVE" }));

      await expect(service.login(loginDto)).rejects.toBeInstanceOf(ForbiddenException);
    });
  });

  describe("refresh", () => {
    const refreshDto: RefreshDto = { refreshToken: "a-refresh-token" };

    it("issues a new token pair for a valid refresh token and active user", async () => {
      const user = await buildUser();
      jwt.verifyAsync.mockResolvedValue({ sub: user.id });
      prisma.user.findUnique.mockResolvedValue(user);

      const result = await service.refresh(refreshDto);

      expect(result.accessToken).toBe("signed-token");
    });

    it("rejects when the refresh token fails verification", async () => {
      jwt.verifyAsync.mockRejectedValue(new Error("bad signature"));

      await expect(service.refresh(refreshDto)).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it("rejects when the user no longer exists", async () => {
      jwt.verifyAsync.mockResolvedValue({ sub: "user-1" });
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(service.refresh(refreshDto)).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it("rejects when the user is no longer active", async () => {
      jwt.verifyAsync.mockResolvedValue({ sub: "user-1" });
      prisma.user.findUnique.mockResolvedValue(await buildUser({ status: "INACTIVE" }));

      await expect(service.refresh(refreshDto)).rejects.toBeInstanceOf(UnauthorizedException);
    });
  });

  describe("requestPasswordReset", () => {
    const requestResetDto: RequestResetDto = { email: "ada@example.com" };
    const GENERIC_MESSAGE = "If this email is registered, you'll receive a reset code shortly.";

    it("invalidates prior codes, creates a new one, and emails it", async () => {
      const user = await buildUser();
      prisma.user.findUnique.mockResolvedValue(user);
      prisma.passwordResetCode.updateMany.mockResolvedValue({ count: 1 });
      prisma.passwordResetCode.create.mockResolvedValue({ id: "code-1" });

      const result = await service.requestPasswordReset(requestResetDto);

      expect(prisma.passwordResetCode.updateMany).toHaveBeenCalledWith({
        where: { userId: user.id, usedAt: null },
        data: { usedAt: expect.any(Date) },
      });
      const createArgs = prisma.passwordResetCode.create.mock.calls[0][0];
      expect(createArgs.data.userId).toBe(user.id);
      expect(createArgs.data.code).toMatch(/^\d{6}$/);
      const expiresInMs = createArgs.data.expiresAt.getTime() - Date.now();
      expect(expiresInMs).toBeGreaterThan(59 * 60 * 1000);
      expect(expiresInMs).toBeLessThanOrEqual(60 * 60 * 1000);
      expect(mailer.sendPasswordResetCode).toHaveBeenCalledWith(user.email, createArgs.data.code);
      expect(result).toEqual({ message: GENERIC_MESSAGE });
    });

    it("still returns the generic success message when the mailer send fails", async () => {
      const user = await buildUser();
      prisma.user.findUnique.mockResolvedValue(user);
      prisma.passwordResetCode.updateMany.mockResolvedValue({ count: 0 });
      prisma.passwordResetCode.create.mockResolvedValue({ id: "code-1" });
      mailer.sendPasswordResetCode.mockRejectedValue(new Error("Brevo is down"));

      const result = await service.requestPasswordReset(requestResetDto);

      expect(result).toEqual({ message: GENERIC_MESSAGE });
    });

    it("returns the same generic message for an unknown email, without emailing", async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      const result = await service.requestPasswordReset(requestResetDto);

      expect(prisma.passwordResetCode.create).not.toHaveBeenCalled();
      expect(mailer.sendPasswordResetCode).not.toHaveBeenCalled();
      expect(result).toEqual({ message: GENERIC_MESSAGE });
    });
  });

  describe("confirmPasswordReset", () => {
    const confirmResetDto: ConfirmResetDto = {
      email: "ada@example.com",
      code: "123456",
      newPassword: "new-correct-horse",
      newPasswordConfirmation: "new-correct-horse",
    };

    it("updates the password hash and marks the code used on a valid code", async () => {
      const user = await buildUser();
      prisma.user.findUnique.mockResolvedValue(user);
      prisma.passwordResetCode.findFirst.mockResolvedValue({
        id: "code-1",
        code: "123456",
        attempts: 0,
        expiresAt: new Date(Date.now() + 60_000),
        usedAt: null,
      });
      prisma.passwordResetCode.updateMany.mockResolvedValue({ count: 1 });

      const result = await service.confirmPasswordReset(confirmResetDto);

      expect(prisma.passwordResetCode.findFirst).toHaveBeenCalledWith({
        where: { userId: user.id, usedAt: null },
        orderBy: { createdAt: "desc" },
      });
      expect(prisma.passwordResetCode.updateMany).toHaveBeenCalledWith({
        where: { id: "code-1", usedAt: null },
        data: { usedAt: expect.any(Date) },
      });
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: user.id },
        data: { passwordHash: expect.any(String) },
      });
      expect(result).toEqual({ message: "Password updated successfully." });
    });

    it("rejects when two concurrent requests race to redeem the same code", async () => {
      const user = await buildUser();
      prisma.user.findUnique.mockResolvedValue(user);
      prisma.passwordResetCode.findFirst.mockResolvedValue({
        id: "code-1",
        code: "123456",
        attempts: 0,
        expiresAt: new Date(Date.now() + 60_000),
        usedAt: null,
      });
      // Another concurrent confirm already claimed it first.
      prisma.passwordResetCode.updateMany.mockResolvedValue({ count: 0 });

      await expect(service.confirmPasswordReset(confirmResetDto)).rejects.toThrow(
        "Invalid or expired code.",
      );
      expect(prisma.user.update).not.toHaveBeenCalled();
    });

    it("rejects an unknown email with a generic invalid-code message", async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(service.confirmPasswordReset(confirmResetDto)).rejects.toBeInstanceOf(
        BadRequestException,
      );
      await expect(service.confirmPasswordReset(confirmResetDto)).rejects.toThrow(
        "Invalid or expired code.",
      );
    });

    it("rejects when there is no active code for the user", async () => {
      prisma.user.findUnique.mockResolvedValue(await buildUser());
      prisma.passwordResetCode.findFirst.mockResolvedValue(null);

      await expect(service.confirmPasswordReset(confirmResetDto)).rejects.toThrow(
        "Invalid or expired code.",
      );
    });

    it("rejects an expired code", async () => {
      prisma.user.findUnique.mockResolvedValue(await buildUser());
      prisma.passwordResetCode.findFirst.mockResolvedValue({
        id: "code-1",
        code: "123456",
        attempts: 0,
        expiresAt: new Date(Date.now() - 1_000),
        usedAt: null,
      });

      await expect(service.confirmPasswordReset(confirmResetDto)).rejects.toThrow(
        "Invalid or expired code.",
      );
    });

    it("increments attempts on a wrong code without burning it before the 5th try", async () => {
      prisma.user.findUnique.mockResolvedValue(await buildUser());
      prisma.passwordResetCode.findFirst.mockResolvedValue({
        id: "code-1",
        code: "000000",
        attempts: 1,
        expiresAt: new Date(Date.now() + 60_000),
        usedAt: null,
      });

      await expect(
        service.confirmPasswordReset({ ...confirmResetDto, code: "123456" }),
      ).rejects.toThrow("Invalid or expired code.");

      expect(prisma.passwordResetCode.update).toHaveBeenCalledWith({
        where: { id: "code-1" },
        data: { attempts: 2 },
      });
    });

    it("burns the code after the 5th wrong attempt", async () => {
      prisma.user.findUnique.mockResolvedValue(await buildUser());
      prisma.passwordResetCode.findFirst.mockResolvedValue({
        id: "code-1",
        code: "000000",
        attempts: 4,
        expiresAt: new Date(Date.now() + 60_000),
        usedAt: null,
      });

      await expect(
        service.confirmPasswordReset({ ...confirmResetDto, code: "123456" }),
      ).rejects.toThrow("Invalid or expired code.");

      expect(prisma.passwordResetCode.update).toHaveBeenCalledWith({
        where: { id: "code-1" },
        data: { attempts: 5, usedAt: expect.any(Date) },
      });
    });
  });
});
