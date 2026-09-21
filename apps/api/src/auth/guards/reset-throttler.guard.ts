import { Injectable } from "@nestjs/common";
import { ThrottlerGuard } from "@nestjs/throttler";

// Same email-keyed tracking as LoginThrottlerGuard: a 6-digit reset code is
// a brute-forceable space, so rate limiting by email (not just IP) matters
// here too.
@Injectable()
export class ResetThrottlerGuard extends ThrottlerGuard {
  protected async getTracker(req: Record<string, unknown>): Promise<string> {
    const body = req.body as Record<string, unknown> | undefined;
    const email = typeof body?.email === "string" ? body.email.toLowerCase() : "unknown";
    return `${req.ip as string}-${email}`;
  }
}
