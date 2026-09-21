import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { ThrottlerModule } from "@nestjs/throttler";

import { AuthModule } from "./auth/auth.module";
import { CategoriesModule } from "./categories/categories.module";
import { HealthController } from "./health/health.controller";
import { PrismaModule } from "./prisma/prisma.module";
import { UsersModule } from "./users/users.module";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    // Provides the storage/config ThrottlerGuard subclasses read from.
    // No global APP_GUARD here on purpose — only the brute-forceable
    // auth endpoints (login, password-reset request/confirm) apply a
    // guard explicitly, scoped exactly to what each spec asks for. A
    // blanket global rate limit is a separate decision to make later,
    // not something to bundle in silently.
    ThrottlerModule.forRoot([{ name: "default", ttl: 300_000, limit: 10 }]),
    PrismaModule,
    AuthModule,
    UsersModule,
    CategoriesModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
