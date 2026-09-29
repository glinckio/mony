import { isLiveSubscription, type PlanType, type SubscriptionStatus } from "@mony/shared-types";

import type { StripeSubscriptionSnapshot } from "./stripe/stripe-gateway";

// Stripe status → local status (docs/specs/subscriptions/design.md).
// Everything that means "Stripe is still trying to get paid" is PAST_DUE
// ("pagamento pendente"), which the Customer Portal fixes.
export function mapStripeStatus(status: string): SubscriptionStatus {
  switch (status) {
    case "trialing":
      return "TRIALING";
    case "active":
      return "ACTIVE";
    case "canceled":
    case "incomplete_expired":
      return "CANCELED";
    default:
      // past_due, unpaid, incomplete, paused, and anything new.
      return "PAST_DUE";
  }
}

const toDate = (seconds: number | null): Date | null =>
  seconds === null ? null : new Date(seconds * 1000);

export interface SubscriptionFields {
  plan: PlanType;
  status: SubscriptionStatus;
  stripeSubscriptionId: string;
  stripeCreatedAt: Date;
  currentPeriodEnd: Date | null;
  trialEndsAt: Date | null;
  cancelScheduled: boolean;
}

export function fieldsFromSnapshot(
  snapshot: StripeSubscriptionSnapshot,
  plan: PlanType,
): SubscriptionFields {
  const status = mapStripeStatus(snapshot.status);
  return {
    plan,
    status,
    stripeSubscriptionId: snapshot.id,
    stripeCreatedAt: new Date(snapshot.created * 1000),
    currentPeriodEnd: toDate(snapshot.currentPeriodEnd),
    trialEndsAt: toDate(snapshot.trialEnd),
    // Stripe schedules a cancellation either at the period end or at an
    // explicit date; a canceled subscription has nothing scheduled.
    cancelScheduled:
      status !== "CANCELED" && (snapshot.cancelAtPeriodEnd || snapshot.cancelAt !== null),
  };
}

type Ranked = { stripeSubscriptionId: string; stripeCreatedAt: Date; status: SubscriptionStatus };

// Whether an incoming Stripe subscription may replace the local row: yes
// when there's none or it's the same subscription; otherwise a live one
// beats one that isn't (a user somehow holding two must see the one that
// still charges), and between equals the newer wins — so a late event for
// an old, replaced subscription never does.
export function shouldApply(current: Ranked | null, incoming: Ranked): boolean {
  if (!current) return true;
  if (current.stripeSubscriptionId === incoming.stripeSubscriptionId) return true;
  const currentLive = isLiveSubscription(current.status);
  const incomingLive = isLiveSubscription(incoming.status);
  if (currentLive !== incomingLive) return incomingLive;
  return incoming.stripeCreatedAt.getTime() > current.stripeCreatedAt.getTime();
}
