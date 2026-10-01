import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from "@nestjs/common";

import { PrismaService } from "../../prisma/prisma.service";
import type { JwtPayload } from "../interfaces/jwt-payload.interface";

// Admin-only endpoints: `@UseGuards(JwtAuthGuard, AdminGuard)`. Role and
// account status are read from the database, not the token — a demoted
// or suspended admin's access token would otherwise keep working until it
// expires (login and refresh already refuse a non-ACTIVE account).
@Injectable()
export class AdminGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<{ user?: JwtPayload }>();
    const userId = request.user?.sub;
    const user = userId
      ? await this.prisma.user.findUnique({
          where: { id: userId },
          select: { role: true, status: true },
        })
      : null;
    if (user?.role !== "ADMIN" || user.status !== "ACTIVE") {
      throw new ForbiddenException("Admins only.");
    }
    return true;
  }
}
