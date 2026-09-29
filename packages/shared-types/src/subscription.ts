import { z } from "zod";

export const PLAN_TYPES = ["MONTHLY", "ANNUAL"] as const;
export const planTypeSchema = z.enum(PLAN_TYPES);
export type PlanType = z.infer<typeof planTypeSchema>;

// Legacy statuses (`assinaturas.status`), mirrored from Stripe. PAST_DUE
// is "payment pending": the Stripe Customer Portal fixes it.
export const SUBSCRIPTION_STATUSES = ["TRIALING", "ACTIVE", "PAST_DUE", "CANCELED"] as const;
export const subscriptionStatusSchema = z.enum(SUBSCRIPTION_STATUSES);
export type SubscriptionStatus = z.infer<typeof subscriptionStatusSchema>;

// Legacy "inclui 7 dias de teste grátis" — first subscription only.
export const TRIAL_DAYS = 7;

export const planSchema = z.object({
  plan: planTypeSchema,
  // Decimal string in the price's currency (e.g. "9.90").
  amount: z.string(),
  currency: z.string(),
  interval: z.enum(["month", "year"]),
  trialDays: z.number(),
});
export type Plan = z.infer<typeof planSchema>;

export const subscriptionSchema = z.object({
  plan: planTypeSchema,
  status: subscriptionStatusSchema,
  // Renews (or, when cancelScheduled, ends) at this instant.
  currentPeriodEnd: z.string().nullable(),
  trialEndsAt: z.string().nullable(),
  cancelScheduled: z.boolean(),
  updatedAt: z.string(),
});
export type Subscription = z.infer<typeof subscriptionSchema>;

export const mySubscriptionSchema = z.object({ subscription: subscriptionSchema.nullable() });
export type MySubscription = z.infer<typeof mySubscriptionSchema>;

export const checkoutInputSchema = z.object({ plan: planTypeSchema });
export type CheckoutInput = z.infer<typeof checkoutInputSchema>;

export const redirectUrlSchema = z.object({ url: z.string() });
export type RedirectUrl = z.infer<typeof redirectUrlSchema>;

// A subscription that still gives access (and blocks a new checkout).
export function isLiveSubscription(status: SubscriptionStatus): boolean {
  return status === "TRIALING" || status === "ACTIVE" || status === "PAST_DUE";
}
