import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";

import { BrevoMailerService } from "./brevo-mailer.service";
import { LogMailerService } from "./log-mailer.service";
import { MailerService } from "./mailer.service";

@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: MailerService,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const apiKey = config.get<string>("BREVO_API_KEY");
        if (process.env.NODE_ENV === "test" || !apiKey) {
          // A missing key in production is a deployment error, not a
          // silent-degrade case — falling back to logging real reset
          // codes into production logs would turn a config mistake into
          // a credential leak.
          if (process.env.NODE_ENV === "production" && !apiKey) {
            throw new Error("BREVO_API_KEY must be set in production.");
          }
          return new LogMailerService();
        }
        return new BrevoMailerService(config);
      },
    },
  ],
  exports: [MailerService],
})
export class MailerModule {}
