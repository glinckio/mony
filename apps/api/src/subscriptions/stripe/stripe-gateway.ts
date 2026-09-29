import type { PlanType } from "@mony/shared-types";
import type Stripe from "stripe";

// The slice of Stripe the subscriptions feature uses, normalized so the
// service (and its tests) never handle raw Stripe objects. Provided by
// StripeModule: the real SDK, an in-memory fake under NODE_ENV=test, or an
// "unconfigured" stand-in that answers 503 in development.

export interface StripePrice {
  id: string;
  // Minor units (centavos).
  unitAmount: number;
  currency: string;
  interval: "month" | "year";
}

export interface StripeSubscriptionSnapshot {
  id: string;
  customerId: string;
  // Stripe's raw status ("trialing", "active", "past_due", …).
  status: string;
  priceId: string | null;
  // Unix seconds.
  created: number;
  currentPeriodEnd: number | null;
  trialEnd: number | null;
  cancelAtPeriodEnd: boolean;
  cancelAt: number | null;
  metadataUserId: string | null;
}

export interface StripeWebhookEvent {
  id: string;
  type: string;
  // The subscription the event is about, when it's one we sync.
  subscriptionId: string | null;
}

export interface CheckoutSessionInput {
  customerId: string;
  priceId: string;
  userId: string;
  trialDays: number | null;
  successUrl: string;
  cancelUrl: string;
}

export abstract class StripeGateway {
  abstract priceId(plan: PlanType): string;
  abstract planOfPrice(priceId: string | null): PlanType | null;
  abstract retrievePrice(priceId: string): Promise<StripePrice>;
  abstract createCustomer(input: { email: string; userId: string }): Promise<string>;
  abstract createCheckoutSession(input: CheckoutSessionInput): Promise<string>;
  abstract retrieveSubscription(id: string): Promise<StripeSubscriptionSnapshot>;
  // Every subscription of a customer, canceled ones included.
  abstract listSubscriptions(customerId: string): Promise<StripeSubscriptionSnapshot[]>;
  // Cancel at the period end (never immediately).
  abstract scheduleCancel(id: string): Promise<StripeSubscriptionSnapshot>;
  // Undo a scheduled cancellation, whether at the period end or at a date
  // (set from the Dashboard or the Customer Portal).
  abstract undoScheduledCancel(id: string): Promise<StripeSubscriptionSnapshot>;
  abstract createPortalSession(customerId: string, returnUrl: string): Promise<string>;
  // Verifies the Stripe-Signature header against the raw body; throws when
  // it doesn't match.
  abstract parseWebhook(rawBody: Buffer, signature: string): StripeWebhookEvent;
}

// Events whose subscription is re-read from Stripe and mirrored locally.
const SUBSCRIPTION_EVENTS = new Set([
  "checkout.session.completed",
  "customer.subscription.created",
  "customer.subscription.updated",
  "customer.subscription.deleted",
  "invoice.paid",
  "invoice.payment_failed",
]);

const idOf = (value: string | { id: string } | null | undefined): string | null =>
  value == null ? null : typeof value === "string" ? value : value.id;

// Which subscription a (verified) event is about — shared by the SDK and
// fake gateways so the tests exercise the same extraction.
export function subscriptionIdOf(event: Stripe.Event): string | null {
  if (!SUBSCRIPTION_EVENTS.has(event.type)) return null;
  const object = event.data.object as unknown as Record<string, unknown>;
  switch (event.type) {
    case "checkout.session.completed":
      return object.mode === "subscription"
        ? idOf(object.subscription as string | { id: string } | null)
        : null;
    case "invoice.paid":
    case "invoice.payment_failed": {
      // The payload follows the webhook ENDPOINT's API version: 2025-03-31+
      // has it under parent.subscription_details, older ones at the top.
      const parent = object.parent as
        | { subscription_details?: { subscription?: string | { id: string } | null } | null }
        | null
        | undefined;
      return (
        idOf(parent?.subscription_details?.subscription) ??
        idOf(object.subscription as string | { id: string } | null | undefined)
      );
    }
    default:
      return typeof object.id === "string" ? object.id : null;
  }
}

// Stripe.Subscription → snapshot. The billing period lives on the
// subscription ITEM since API 2025-03-31.
export function snapshotOf(subscription: Stripe.Subscription): StripeSubscriptionSnapshot {
  const item = subscription.items.data[0];
  return {
    id: subscription.id,
    customerId: idOf(subscription.customer as string | { id: string })!,
    status: subscription.status,
    priceId: item?.price.id ?? null,
    created: subscription.created,
    currentPeriodEnd: item?.current_period_end ?? null,
    trialEnd: subscription.trial_end,
    cancelAtPeriodEnd: subscription.cancel_at_period_end,
    cancelAt: subscription.cancel_at,
    metadataUserId: subscription.metadata?.userId ?? null,
  };
}
