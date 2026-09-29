import {
  PLAN_TYPES,
  SUBSCRIPTION_STATUSES,
  TRIAL_DAYS,
  checkoutInputSchema,
  isLiveSubscription,
} from "./subscription";

describe("subscription", () => {
  it("has legacy's two plans and 7-day trial", () => {
    expect(PLAN_TYPES).toEqual(["MONTHLY", "ANNUAL"]);
    expect(TRIAL_DAYS).toBe(7);
  });

  it("accepts only a known plan at checkout", () => {
    expect(checkoutInputSchema.safeParse({ plan: "ANNUAL" }).success).toBe(true);
    expect(checkoutInputSchema.safeParse({ plan: "anual" }).success).toBe(false);
    expect(checkoutInputSchema.safeParse({}).success).toBe(false);
  });

  it("treats trial, active and payment-pending as live, canceled as not", () => {
    expect(SUBSCRIPTION_STATUSES.filter(isLiveSubscription)).toEqual([
      "TRIALING",
      "ACTIVE",
      "PAST_DUE",
    ]);
  });
});
