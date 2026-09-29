import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";

import { StripeModule } from "./stripe/stripe.module";
import { StripeWebhookController } from "./stripe-webhook.controller";
import { SubscriptionsController } from "./subscriptions.controller";
import { SubscriptionsService } from "./subscriptions.service";

@Module({
  imports: [ConfigModule, StripeModule],
  controllers: [SubscriptionsController, StripeWebhookController],
  providers: [SubscriptionsService],
})
export class SubscriptionsModule {}
