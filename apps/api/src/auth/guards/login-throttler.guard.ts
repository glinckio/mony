import { Injectable } from "@nestjs/common";
import { ThrottlerGuard } from "@nestjs/throttler";

// Tracks by IP + email combined (not just IP) so a distributed brute-force
// against one victim email is caught even if the attacker rotates IPs,
// and one IP hammering many different emails is still rate-limited.
@Injectable()
export class LoginThrottlerGuard extends ThrottlerGuard {
  protected async getTracker(req: Record<string, unknown>): Promise<string> {
    const body = req.body as Record<string, unknown> | undefined;
    const email = typeof body?.email === "string" ? body.email.toLowerCase() : "unknown";
    return `${req.ip as string}-${email}`;
  }
}
