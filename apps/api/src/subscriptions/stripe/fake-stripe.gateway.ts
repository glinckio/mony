import { randomUUID } from "crypto";

import type { PlanType } from "@mony/shared-types";
import Stripe from "stripe";

import {
  StripeGateway,
  subscriptionIdOf,
  type CheckoutSessionInput,
  type StripePrice,
  type StripeSubscriptionSnapshot,
  type StripeWebhookEvent,
} from "./stripe-gateway";

export const FAKE_WEBHOOK_SECRET = "whsec_test_mony_fake";
export const FAKE_PRICES: Record<PlanType, StripePrice> = {
  MONTHLY: { id: "price_test_monthly", unitAmount: 990, currency: "brl", interval: "month" },
  ANNUAL: { id: "price_test_annual", unitAmount: 6534, currency: "brl", interval: "year" },
};

interface FakeSession extends CheckoutSessionInput {
  id: string;
}

// In-memory Stripe for NODE_ENV=test: no network, deterministic. Webhook
// verification still runs Stripe's real signature code (with a known test
// secret), so tests sign payloads with `sign()` exactly like Stripe does.
export class FakeStripeGateway extends StripeGateway {
  private readonly verifier = new Stripe("sk_test_fake_for_signature_checks");
  readonly customers = new Map<string, { email: string; userId: string }>();
  readonly sessions = new Map<string, FakeSession>();
  readonly subscriptions = new Map<string, StripeSubscriptionSnapshot>();
  readonly portalSessions: Array<{ customerId: string; returnUrl: string }> = [];
  // Set to make the next API call fail (simulates a Stripe outage).
  failNext: Error | null = null;

  priceId(plan: PlanType): string {
    return FAKE_PRICES[plan].id;
  }

  planOfPrice(priceId: string | null): PlanType | null {
    if (priceId === FAKE_PRICES.MONTHLY.id) return "MONTHLY";
    if (priceId === FAKE_PRICES.ANNUAL.id) return "ANNUAL";
    return null;
  }

  async retrievePrice(priceId: string): Promise<StripePrice> {
    this.maybeFail();
    const price = Object.values(FAKE_PRICES).find((candidate) => candidate.id === priceId);
    if (!price) throw new Error(`No such price: ${priceId}`);
    return price;
  }

  async createCustomer(input: { email: string; userId: string }): Promise<string> {
    this.maybeFail();
    const id = `cus_test_${randomUUID()}`;
    this.customers.set(id, input);
    return id;
  }

  async createCheckoutSession(input: CheckoutSessionInput): Promise<string> {
    this.maybeFail();
    const id = `cs_test_${randomUUID()}`;
    this.sessions.set(id, { ...input, id });
    return `https://checkout.stripe.test/c/pay/${id}`;
  }

  async retrieveSubscription(id: string): Promise<StripeSubscriptionSnapshot> {
    this.maybeFail();
    const subscription = this.subscriptions.get(id);
    if (!subscription) throw new Error(`No such subscription: ${id}`);
    return { ...subscription };
  }

  async listSubscriptions(customerId: string): Promise<StripeSubscriptionSnapshot[]> {
    this.maybeFail();
    return [...this.subscriptions.values()]
      .filter((subscription) => subscription.customerId === customerId)
      .map((subscription) => ({ ...subscription }));
  }

  async scheduleCancel(id: string): Promise<StripeSubscriptionSnapshot> {
    return this.update(id, { cancelAtPeriodEnd: true });
  }

  async undoScheduledCancel(id: string): Promise<StripeSubscriptionSnapshot> {
    return this.update(id, { cancelAtPeriodEnd: false, cancelAt: null });
  }

  // Like Stripe: a canceled subscription can't be changed any more.
  private async update(
    id: string,
    changes: Partial<StripeSubscriptionSnapshot>,
  ): Promise<StripeSubscriptionSnapshot> {
    const subscription = await this.retrieveSubscription(id);
    if (subscription.status === "canceled") {
      throw new Error(`Subscription ${id} is canceled.`);
    }
    const updated = { ...subscription, ...changes };
    this.subscriptions.set(id, updated);
    return { ...updated };
  }

  async createPortalSession(customerId: string, returnUrl: string): Promise<string> {
    this.maybeFail();
    this.portalSessions.push({ customerId, returnUrl });
    return `https://billing.stripe.test/p/session/${randomUUID()}`;
  }

  parseWebhook(rawBody: Buffer, signature: string): StripeWebhookEvent {
    const event = this.verifier.webhooks.constructEvent(rawBody, signature, FAKE_WEBHOOK_SECRET);
    return { id: event.id, type: event.type, subscriptionId: subscriptionIdOf(event) };
  }

  // ---- test helpers ----

  // What Stripe does when the customer finishes Checkout: creates the
  // subscription (trialing when the session asked for a trial).
  completeCheckout(
    sessionUrl: string,
    overrides: Partial<StripeSubscriptionSnapshot> = {},
  ): StripeSubscriptionSnapshot {
    const sessionId = sessionUrl.split("/").pop()!;
    const session = this.sessions.get(sessionId);
    if (!session) throw new Error(`No such session: ${sessionId}`);
    const now = Math.floor(Date.now() / 1000);
    const trialEnd = session.trialDays ? now + session.trialDays * 86_400 : null;
    const subscription: StripeSubscriptionSnapshot = {
      id: `sub_test_${randomUUID()}`,
      customerId: session.customerId,
      status: trialEnd ? "trialing" : "active",
      priceId: session.priceId,
      created: now,
      currentPeriodEnd:
        trialEnd ?? now + (session.priceId === FAKE_PRICES.ANNUAL.id ? 365 : 30) * 86_400,
      trialEnd,
      cancelAtPeriodEnd: false,
      cancelAt: null,
      metadataUserId: session.userId,
      ...overrides,
    };
    this.subscriptions.set(subscription.id, subscription);
    return subscription;
  }

  // A signed webhook request body + header, like Stripe would send.
  sign(event: { type: string; object: Record<string, unknown> }): {
    body: string;
    signature: string;
  } {
    const body = JSON.stringify({
      id: `evt_test_${randomUUID()}`,
      object: "event",
      type: event.type,
      data: { object: event.object },
    });
    const signature = this.verifier.webhooks.generateTestHeaderString({
      payload: body,
      secret: FAKE_WEBHOOK_SECRET,
    });
    return { body, signature };
  }

  private maybeFail(): void {
    if (this.failNext) {
      const error = this.failNext;
      this.failNext = null;
      throw error;
    }
  }
}
