import { Logger, Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";

import { FakeStripeGateway } from "./fake-stripe.gateway";
import { StripeGateway } from "./stripe-gateway";
import { StripeSdkGateway } from "./stripe-sdk.gateway";
import { UnconfiguredStripeGateway } from "./unconfigured-stripe.gateway";

const REQUIRED = [
  "STRIPE_SECRET_KEY",
  "STRIPE_WEBHOOK_SECRET",
  "STRIPE_PRICE_MONTHLY",
  "STRIPE_PRICE_ANNUAL",
] as const;

@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: StripeGateway,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        // Tests never call Stripe.
        if (process.env.NODE_ENV === "test") return new FakeStripeGateway();

        const missing = REQUIRED.filter((key) => !config.get<string>(key));
        if (missing.length > 0) {
          // Same rule as the mailer and storage: a missing payment config
          // in production is a deployment error, not a silent degrade.
          if (process.env.NODE_ENV === "production") {
            throw new Error(`${missing.join(", ")} must be set in production.`);
          }
          new Logger(StripeModule.name).warn(
            `Stripe not configured (${missing.join(", ")}) — subscription endpoints answer 503.`,
          );
          return new UnconfiguredStripeGateway();
        }
        if (process.env.NODE_ENV === "production") {
          // Stripe's return URLs go through here, in the in-app browser
          // right after payment: never in clear text.
          const publicUrl = config.get<string>("API_PUBLIC_URL") ?? "";
          if (!publicUrl.startsWith("https://")) {
            throw new Error("API_PUBLIC_URL must be set and use https:// in production.");
          }
          if (config.get<string>("STRIPE_SECRET_KEY")!.startsWith("sk_test_")) {
            new Logger(StripeModule.name).warn("Using a Stripe TEST key in production.");
          }
        }
        return new StripeSdkGateway({
          secretKey: config.get<string>("STRIPE_SECRET_KEY")!,
          webhookSecret: config.get<string>("STRIPE_WEBHOOK_SECRET")!,
          prices: {
            MONTHLY: config.get<string>("STRIPE_PRICE_MONTHLY")!,
            ANNUAL: config.get<string>("STRIPE_PRICE_ANNUAL")!,
          },
        });
      },
    },
  ],
  exports: [StripeGateway],
})
export class StripeModule {}
