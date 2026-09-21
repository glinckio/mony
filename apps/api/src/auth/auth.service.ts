import { randomInt, randomUUID } from "crypto";

import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import type { User } from "@prisma/client";
import * as bcrypt from "bcryptjs";

import { MailerService } from "../common/mailer/mailer.service";
import { PrismaService } from "../prisma/prisma.service";

import { AuthTokensDto } from "./dto/auth-tokens.dto";
import { ConfirmResetDto } from "./dto/confirm-reset.dto";
import { LoginDto } from "./dto/login.dto";
import { MessageDto } from "./dto/message.dto";
import { RefreshDto } from "./dto/refresh.dto";
import { RegisterDto } from "./dto/register.dto";
import { RequestResetDto } from "./dto/request-reset.dto";
import type { JwtPayload } from "./interfaces/jwt-payload.interface";

const BCRYPT_SALT_ROUNDS = 12;
const RESET_CODE_TTL_MS = 60 * 60 * 1000;
const RESET_CODE_MAX_ATTEMPTS = 5;
const RESET_REQUEST_GENERIC_MESSAGE =
  "If this email is registered, you'll receive a reset code shortly.";
const RESET_CONFIRM_GENERIC_ERROR = "Invalid or expired code.";

type IssuableUser = Pick<User, "id" | "name" | "email" | "role" | "activeWorkspace">;

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly mailer: MailerService,
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

  async requestPasswordReset(dto: RequestResetDto): Promise<MessageDto> {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });

    // Always return the same generic message, on the same code path, so
    // the response can't be used to enumerate registered emails — matches
    // legacy behavior.
    if (!user) {
      return { message: RESET_REQUEST_GENERIC_MESSAGE };
    }

    const code = randomInt(0, 1_000_000).toString().padStart(6, "0");
    await this.prisma.$transaction([
      this.prisma.passwordResetCode.updateMany({
        where: { userId: user.id, usedAt: null },
        data: { usedAt: new Date() },
      }),
      this.prisma.passwordResetCode.create({
        data: { userId: user.id, code, expiresAt: new Date(Date.now() + RESET_CODE_TTL_MS) },
      }),
    ]);

    // Not awaited: an outbound Brevo call sitting in the request path
    // would both slow this endpoint down and — since only the
    // registered-email branch makes this call — leak which emails are
    // registered through response timing. A delivery failure is logged
    // but still yields the same generic response.
    this.mailer
      .sendPasswordResetCode(user.email, code)
      .catch((error: unknown) => this.logger.error("Failed to send password reset email", error));

    return { message: RESET_REQUEST_GENERIC_MESSAGE };
  }

  async confirmPasswordReset(dto: ConfirmResetDto): Promise<MessageDto> {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (!user) {
      throw new BadRequestException(RESET_CONFIRM_GENERIC_ERROR);
    }

    // At most one unused code per user at a time (a new request invalidates
    // priors), so the active code — not a code-matching lookup — is what
    // attempts are tracked against. This bounds brute-forcing a single
    // code to RESET_CODE_MAX_ATTEMPTS guesses regardless of how many
    // source IPs an attacker spreads the guesses across.
    const resetCode = await this.prisma.passwordResetCode.findFirst({
      where: { userId: user.id, usedAt: null },
      orderBy: { createdAt: "desc" },
    });

    if (!resetCode || resetCode.expiresAt < new Date()) {
      throw new BadRequestException(RESET_CONFIRM_GENERIC_ERROR);
    }

    if (resetCode.code !== dto.code) {
      const attempts = resetCode.attempts + 1;
      const burned = attempts >= RESET_CODE_MAX_ATTEMPTS;
      await this.prisma.passwordResetCode.update({
        where: { id: resetCode.id },
        data: { attempts, ...(burned ? { usedAt: new Date() } : {}) },
      });
      throw new BadRequestException(RESET_CONFIRM_GENERIC_ERROR);
    }

    const passwordHash = await bcrypt.hash(dto.newPassword, BCRYPT_SALT_ROUNDS);

    await this.prisma.$transaction(async (tx) => {
      // Conditional on usedAt still being null: guards against two
      // concurrent requests both passing the check above and both trying
      // to redeem the same code.
      const claim = await tx.passwordResetCode.updateMany({
        where: { id: resetCode.id, usedAt: null },
        data: { usedAt: new Date() },
      });
      if (claim.count !== 1) {
        throw new BadRequestException(RESET_CONFIRM_GENERIC_ERROR);
      }
      await tx.user.update({ where: { id: user.id }, data: { passwordHash } });
    });

    return { message: "Password updated successfully." };
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
