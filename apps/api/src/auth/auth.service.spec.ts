import { ConflictException, ForbiddenException, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { Test, TestingModule } from "@nestjs/testing";
import * as bcrypt from "bcryptjs";

import { PrismaService } from "../prisma/prisma.service";

import { AuthService } from "./auth.service";
import { LoginDto } from "./dto/login.dto";
import { RefreshDto } from "./dto/refresh.dto";
import { RegisterDto } from "./dto/register.dto";

describe("AuthService", () => {
  let service: AuthService;
  let prisma: {
    user: { findUnique: jest.Mock; create: jest.Mock; update: jest.Mock };
  };
  let jwt: { signAsync: jest.Mock; verifyAsync: jest.Mock };

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
    };
    jwt = {
      signAsync: jest.fn().mockResolvedValue("signed-token"),
      verifyAsync: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prisma },
        { provide: JwtService, useValue: jwt },
        {
          provide: ConfigService,
          useValue: { get: jest.fn().mockReturnValue("config-value") },
        },
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
});
