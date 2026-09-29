import type { PlanType } from "@mony/shared-types";
import Stripe from "stripe";

import {
  StripeGateway,
  snapshotOf,
  subscriptionIdOf,
  type CheckoutSessionInput,
  type StripePrice,
  type StripeSubscriptionSnapshot,
  type StripeWebhookEvent,
} from "./stripe-gateway";

export interface StripeSdkConfig {
  secretKey: string;
  webhookSecret: string;
  prices: Record<PlanType, string>;
}

// The real Stripe API (SDK pinned to its own API version).
export class StripeSdkGateway extends StripeGateway {
  private readonly stripe: Stripe;

  constructor(private readonly config: StripeSdkConfig) {
    super();
    // The SDK's default is an 80 s timeout, retried: a slow Stripe could
    // hold a user's request (or a webhook) for minutes. 10 s, one retry.
    this.stripe = new Stripe(config.secretKey, { maxNetworkRetries: 1, timeout: 10_000 });
  }

  priceId(plan: PlanType): string {
    return this.config.prices[plan];
  }

  planOfPrice(priceId: string | null): PlanType | null {
    if (priceId === this.config.prices.MONTHLY) return "MONTHLY";
    if (priceId === this.config.prices.ANNUAL) return "ANNUAL";
    return null;
  }

  async retrievePrice(priceId: string): Promise<StripePrice> {
    const price = await this.stripe.prices.retrieve(priceId);
    const interval = price.recurring?.interval;
    if (price.unit_amount === null || (interval !== "month" && interval !== "year")) {
      throw new Error(`Stripe price ${priceId} must be a monthly or yearly fixed price.`);
    }
    return {
      id: price.id,
      unitAmount: price.unit_amount,
      currency: price.currency,
      interval: interval as "month" | "year",
    };
  }

  // metadata.userId lets account deletion find every customer of a user
  // (customers.search). The key makes parallel first checkouts converge
  // on one customer (Stripe keeps idempotency keys for 24 h).
  async createCustomer(input: { email: string; userId: string }): Promise<string> {
    const customer = await this.stripe.customers.create(
      { email: input.email, metadata: { userId: input.userId } },
      { idempotencyKey: `customer-create-${input.userId}` },
    );
    return customer.id;
  }

  async createCheckoutSession(input: CheckoutSessionInput): Promise<string> {
    const session = await this.stripe.checkout.sessions.create({
      mode: "subscription",
      customer: input.customerId,
      // Card only: other methods (e.g. Boleto) would have Stripe collect
      // CPF and address, which the privacy policy doesn't cover.
      payment_method_types: ["card"],
      line_items: [{ price: input.priceId, quantity: 1 }],
      subscription_data: {
        metadata: { userId: input.userId },
        ...(input.trialDays ? { trial_period_days: input.trialDays } : {}),
      },
      success_url: input.successUrl,
      cancel_url: input.cancelUrl,
    });
    if (!session.url) throw new Error("Stripe returned a Checkout Session without a URL.");
    return session.url;
  }

  async retrieveSubscription(id: string): Promise<StripeSubscriptionSnapshot> {
    return snapshotOf(await this.stripe.subscriptions.retrieve(id));
  }

  async listSubscriptions(customerId: string): Promise<StripeSubscriptionSnapshot[]> {
    const page = await this.stripe.subscriptions.list({
      customer: customerId,
      status: "all",
      limit: 100,
    });
    return page.data.map(snapshotOf);
  }

  async scheduleCancel(id: string): Promise<StripeSubscriptionSnapshot> {
    return snapshotOf(await this.stripe.subscriptions.update(id, { cancel_at_period_end: true }));
  }

  // Clearing cancel_at_period_end also clears the cancel_at it implies; a
  // cancellation at an explicit date is cleared with an empty cancel_at.
  async undoScheduledCancel(id: string): Promise<StripeSubscriptionSnapshot> {
    const current = await this.stripe.subscriptions.retrieve(id);
    if (current.cancel_at_period_end) {
      return snapshotOf(
        await this.stripe.subscriptions.update(id, { cancel_at_period_end: false }),
      );
    }
    if (current.cancel_at !== null) {
      return snapshotOf(await this.stripe.subscriptions.update(id, { cancel_at: "" }));
    }
    return snapshotOf(current);
  }

  async createPortalSession(customerId: string, returnUrl: string): Promise<string> {
    const session = await this.stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl,
    });
    return session.url;
  }

  parseWebhook(rawBody: Buffer, signature: string): StripeWebhookEvent {
    const event = this.stripe.webhooks.constructEvent(
      rawBody,
      signature,
      this.config.webhookSecret,
    );
    return { id: event.id, type: event.type, subscriptionId: subscriptionIdOf(event) };
  }
}
