import { Injectable, Logger } from "@nestjs/common";

import { MailerService } from "./mailer.service";

// Used in place of BrevoMailerService when there's no BREVO_API_KEY
// configured (local dev) or when running E2E tests (NODE_ENV=test) — logs
// the code instead of sending a real email, so the reset flow is testable
// without a Brevo account.
@Injectable()
export class LogMailerService extends MailerService {
  private readonly logger = new Logger(LogMailerService.name);

  async sendPasswordResetCode(email: string, code: string): Promise<void> {
    // debug (not log): a standard prod log-level filter suppresses this
    // even if it were ever somehow reached, as a second line of defense
    // behind MailerModule's startup guard.
    this.logger.debug(`Password reset code for ${email}: ${code}`);
  }
}
