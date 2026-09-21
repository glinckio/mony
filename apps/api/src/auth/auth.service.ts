import { randomUUID } from "crypto";

import {
  ConflictException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import type { User } from "@prisma/client";
import * as bcrypt from "bcryptjs";

import { PrismaService } from "../prisma/prisma.service";

import { AuthTokensDto } from "./dto/auth-tokens.dto";
import { LoginDto } from "./dto/login.dto";
import { RefreshDto } from "./dto/refresh.dto";
import { RegisterDto } from "./dto/register.dto";
import type { JwtPayload } from "./interfaces/jwt-payload.interface";

const BCRYPT_SALT_ROUNDS = 12;

type IssuableUser = Pick<User, "id" | "name" | "email" | "role" | "activeWorkspace">;

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  async register(dto: RegisterDto): Promise<AuthTokensDto> {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) {
      throw new ConflictException("This email is already registered.");
    }

    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_SALT_ROUNDS);

    const user = await this.prisma.user.create({
      data: {
        name: dto.name,
        email: dto.email,
        phone: dto.phone,
        passwordHash,
      },
    });

    return this.issueTokens(user);
  }

  async login(dto: LoginDto): Promise<AuthTokensDto> {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (!user) {
      throw new UnauthorizedException("Incorrect email or password.");
    }

    const passwordMatches = await bcrypt.compare(dto.password, user.passwordHash);
    if (!passwordMatches) {
      throw new UnauthorizedException("Incorrect email or password.");
    }

    if (user.status !== "ACTIVE") {
      throw new ForbiddenException("Account inactive. Please contact support.");
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastAccessAt: new Date() },
    });

    return this.issueTokens(user);
  }

  async refresh(dto: RefreshDto): Promise<AuthTokensDto> {
    let payload: JwtPayload;
    try {
      payload = await this.jwt.verifyAsync<JwtPayload>(dto.refreshToken, {
        secret: this.config.get<string>("JWT_REFRESH_SECRET"),
      });
    } catch {
      throw new UnauthorizedException("Invalid or expired refresh token.");
    }

    const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user || user.status !== "ACTIVE") {
      throw new UnauthorizedException("Invalid or expired refresh token.");
    }

    return this.issueTokens(user);
  }

  private async issueTokens(user: IssuableUser): Promise<AuthTokensDto> {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      activeWorkspace: user.activeWorkspace,
    };

    // `jti` guarantees each issued token is distinct even when signed
    // within the same second for the same user (JWTs are otherwise a
    // deterministic function of header+payload+secret) — also gives a
    // concrete handle for a future revocation list.
    const accessToken = await this.jwt.signAsync(
      { ...payload, jti: randomUUID() },
      {
        secret: this.config.get<string>("JWT_ACCESS_SECRET"),
        expiresIn: this.config.get<string>("JWT_ACCESS_TTL"),
      },
    );
    const refreshToken = await this.jwt.signAsync(
      { ...payload, jti: randomUUID() },
      {
        secret: this.config.get<string>("JWT_REFRESH_SECRET"),
        expiresIn: this.config.get<string>("JWT_REFRESH_TTL"),
      },
    );

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        activeWorkspace: user.activeWorkspace,
      },
    };
  }
}
