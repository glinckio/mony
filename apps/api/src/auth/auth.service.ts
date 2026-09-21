import { ConflictException, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import * as bcrypt from "bcryptjs";

import { PrismaService } from "../prisma/prisma.service";

import { AuthTokensDto } from "./dto/auth-tokens.dto";
import { RegisterDto } from "./dto/register.dto";

const BCRYPT_SALT_ROUNDS = 12;

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

    return this.issueTokens(user.id, user.name, user.email, user.activeWorkspace);
  }

  private async issueTokens(
    userId: string,
    name: string,
    email: string,
    activeWorkspace: "PERSONAL" | "BUSINESS",
  ): Promise<AuthTokensDto> {
    const payload = { sub: userId };

    const accessToken = await this.jwt.signAsync(payload, {
      secret: this.config.get<string>("JWT_ACCESS_SECRET"),
      expiresIn: this.config.get<string>("JWT_ACCESS_TTL"),
    });
    const refreshToken = await this.jwt.signAsync(payload, {
      secret: this.config.get<string>("JWT_REFRESH_SECRET"),
      expiresIn: this.config.get<string>("JWT_REFRESH_TTL"),
    });

    return {
      accessToken,
      refreshToken,
      user: { id: userId, name, email, activeWorkspace },
    };
  }
}
