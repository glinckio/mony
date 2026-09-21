import { ConflictException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { Test, TestingModule } from "@nestjs/testing";
import * as bcrypt from "bcryptjs";

import { PrismaService } from "../prisma/prisma.service";

import { AuthService } from "./auth.service";
import { RegisterDto } from "./dto/register.dto";

describe("AuthService", () => {
  let service: AuthService;
  let prisma: { user: { findUnique: jest.Mock; create: jest.Mock } };
  let jwt: { signAsync: jest.Mock };

  const registerDto: RegisterDto = {
    name: "Ada Lovelace",
    email: "ada@example.com",
    password: "correcthorsebattery",
    passwordConfirmation: "correcthorsebattery",
  };

  beforeEach(async () => {
    prisma = {
      user: {
        findUnique: jest.fn(),
        create: jest.fn(),
      },
    };
    jwt = {
      signAsync: jest.fn().mockResolvedValue("signed-token"),
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

  it("creates a user with a bcrypt-hashed password and returns tokens", async () => {
    prisma.user.findUnique.mockResolvedValue(null);
    prisma.user.create.mockResolvedValue({
      id: "user-1",
      name: registerDto.name,
      email: registerDto.email,
      activeWorkspace: "PERSONAL",
    });

    const result = await service.register(registerDto);

    expect(prisma.user.findUnique).toHaveBeenCalledWith({ where: { email: registerDto.email } });
    const createArgs = prisma.user.create.mock.calls[0][0];
    expect(createArgs.data.email).toBe(registerDto.email);
    expect(createArgs.data.passwordHash).not.toBe(registerDto.password);
    await expect(bcrypt.compare(registerDto.password, createArgs.data.passwordHash)).resolves.toBe(
      true,
    );

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
