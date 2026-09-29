import type Stripe from "stripe";

import {
  snapshotOf,
  subscriptionIdOf,
  type StripeSubscriptionSnapshot,
} from "./stripe/stripe-gateway";
import { fieldsFromSnapshot, mapStripeStatus, shouldApply } from "./subscription-sync";

const snapshot = (
  overrides: Partial<StripeSubscriptionSnapshot> = {},
): StripeSubscriptionSnapshot => ({
  id: "sub_1",
  customerId: "cus_1",
  status: "active",
  priceId: "price_monthly",
  created: 1_790_000_000,
  currentPeriodEnd: 1_792_592_000,
  trialEnd: null,
  cancelAtPeriodEnd: false,
  cancelAt: null,
  metadataUserId: "user-1",
  ...overrides,
});

describe("mapStripeStatus", () => {
  it("maps Stripe's statuses onto the four local ones", () => {
    expect(mapStripeStatus("trialing")).toBe("TRIALING");
    expect(mapStripeStatus("active")).toBe("ACTIVE");
    for (const pending of ["past_due", "unpaid", "incomplete", "paused", "something_new"]) {
      expect(mapStripeStatus(pending)).toBe("PAST_DUE");
    }
    expect(mapStripeStatus("canceled")).toBe("CANCELED");
    expect(mapStripeStatus("incomplete_expired")).toBe("CANCELED");
  });
});

describe("fieldsFromSnapshot", () => {
  it("converts Stripe's unix seconds and keeps the plan", () => {
    expect(fieldsFromSnapshot(snapshot({ trialEnd: 1_790_604_800 }), "MONTHLY")).toEqual({
      plan: "MONTHLY",
      status: "ACTIVE",
      stripeSubscriptionId: "sub_1",
      stripeCreatedAt: new Date(1_790_000_000_000),
      currentPeriodEnd: new Date(1_792_592_000_000),
      trialEndsAt: new Date(1_790_604_800_000),
      cancelScheduled: false,
    });
  });

  it("treats cancel-at-period-end and an explicit cancel date as scheduled, but not once canceled", () => {
    expect(
      fieldsFromSnapshot(snapshot({ cancelAtPeriodEnd: true }), "ANNUAL").cancelScheduled,
    ).toBe(true);
    expect(
      fieldsFromSnapshot(snapshot({ cancelAt: 1_792_592_000 }), "ANNUAL").cancelScheduled,
    ).toBe(true);
    expect(
      fieldsFromSnapshot(snapshot({ status: "canceled", cancelAtPeriodEnd: true }), "ANNUAL")
        .cancelScheduled,
    ).toBe(false);
  });
});

describe("shouldApply", () => {
  const current = {
    stripeSubscriptionId: "sub_new",
    stripeCreatedAt: new Date(2_000),
    status: "ACTIVE" as const,
  };
  const other = (id: string, at: number, status: "ACTIVE" | "CANCELED" | "PAST_DUE") => ({
    stripeSubscriptionId: id,
    stripeCreatedAt: new Date(at),
    status,
  });

  it("applies when there's nothing yet, for the same subscription, or for a newer one", () => {
    expect(shouldApply(null, current)).toBe(true);
    expect(shouldApply(current, { ...current, status: "CANCELED" })).toBe(true);
    expect(shouldApply(current, other("sub_newer", 3_000, "ACTIVE"))).toBe(true);
  });

  it("ignores a late event for an older, replaced subscription", () => {
    expect(shouldApply(current, other("sub_old", 1_000, "ACTIVE"))).toBe(false);
    expect(
      shouldApply({ ...current, status: "CANCELED" }, other("sub_old", 1_000, "CANCELED")),
    ).toBe(false);
  });

  it("keeps the subscription that still charges when a user holds two", () => {
    // A newer duplicate that ended doesn't hide the older one still billing…
    expect(shouldApply(current, other("sub_newer", 3_000, "CANCELED"))).toBe(false);
    // …and the live older one takes over from an ended newer one.
    expect(
      shouldApply({ ...current, status: "CANCELED" }, other("sub_old", 1_000, "PAST_DUE")),
    ).toBe(true);
  });
});

describe("subscriptionIdOf", () => {
  const event = (type: string, object: Record<string, unknown>) =>
    ({ id: "evt_1", type, data: { object } }) as unknown as Stripe.Event;

  it("finds the subscription in each synced event type", () => {
    expect(subscriptionIdOf(event("customer.subscription.updated", { id: "sub_1" }))).toBe("sub_1");
    expect(subscriptionIdOf(event("customer.subscription.deleted", { id: "sub_1" }))).toBe("sub_1");
    expect(
      subscriptionIdOf(
        event("checkout.session.completed", { mode: "subscription", subscription: "sub_2" }),
      ),
    ).toBe("sub_2");
    expect(
      subscriptionIdOf(
        event("invoice.payment_failed", {
          parent: { subscription_details: { subscription: { id: "sub_3" } } },
        }),
      ),
    ).toBe("sub_3");
    // A webhook endpoint on an API version before 2025-03-31.
    expect(subscriptionIdOf(event("invoice.paid", { subscription: "sub_4" }))).toBe("sub_4");
  });

  it("ignores other events and one-off checkouts", () => {
    expect(subscriptionIdOf(event("customer.created", { id: "cus_1" }))).toBeNull();
    expect(subscriptionIdOf(event("checkout.session.completed", { mode: "payment" }))).toBeNull();
    expect(subscriptionIdOf(event("invoice.paid", { parent: null }))).toBeNull();
  });
});

describe("snapshotOf", () => {
  it("reads the billing period and price from the subscription item (API 2025-03-31+)", () => {
    const subscription = {
      id: "sub_1",
      customer: { id: "cus_1" },
      status: "trialing",
      created: 100,
      trial_end: 200,
      cancel_at_period_end: false,
      cancel_at: null,
      metadata: { userId: "user-1" },
      items: { data: [{ current_period_end: 300, price: { id: "price_annual" } }] },
    } as unknown as Stripe.Subscription;

    expect(snapshotOf(subscription)).toEqual({
      id: "sub_1",
      customerId: "cus_1",
      status: "trialing",
      priceId: "price_annual",
      created: 100,
      currentPeriodEnd: 300,
      trialEnd: 200,
      cancelAtPeriodEnd: false,
      cancelAt: null,
      metadataUserId: "user-1",
    });
  });
});
