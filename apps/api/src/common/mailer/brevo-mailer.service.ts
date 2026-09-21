import { BrevoClient } from "@getbrevo/brevo";
import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

import { MailerService } from "./mailer.service";

@Injectable()
export class BrevoMailerService extends MailerService {
  private readonly client: BrevoClient;

  constructor(private readonly config: ConfigService) {
    super();
    // MailerModule only constructs this class when BREVO_API_KEY is set.
    this.client = new BrevoClient({ apiKey: this.config.get<string>("BREVO_API_KEY")! });
  }

  async sendPasswordResetCode(email: string, code: string): Promise<void> {
    await this.client.transactionalEmails.sendTransacEmail({
      subject: "Seu código de redefinição de senha — Mony",
      textContent: `Seu código de redefinição de senha é ${code}. Ele expira em 1 hora.`,
      htmlContent: `<p>Seu código de redefinição de senha é <strong>${code}</strong>.</p><p>Ele expira em 1 hora.</p>`,
      sender: {
        name: this.config.get<string>("BREVO_SENDER_NAME"),
        email: this.config.get<string>("BREVO_SENDER_EMAIL"),
      },
      to: [{ email }],
    });
  }
}
