import { createParamDecorator, type ExecutionContext } from "@nestjs/common";

import type { JwtPayload } from "../interfaces/jwt-payload.interface";

// Usage: `method(@CurrentUser() user: JwtPayload)` on any route behind
// JwtAuthGuard.
export const CurrentUser = createParamDecorator((_: unknown, ctx: ExecutionContext): JwtPayload => {
  const request = ctx.switchToHttp().getRequest();
  return request.user;
});
