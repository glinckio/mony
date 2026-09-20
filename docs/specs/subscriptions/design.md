# Design — Subscriptions

## Data model (Prisma)

```prisma
enum PlanType {
  MONTHLY
  ANNUAL
}

enum SubscriptionStatus {
  TRIALING
  ACTIVE
  PAST_DUE
  CANCELED
}

model Subscription {
  id                 String             @id @default(uuid())
  userId             String             @unique
  user               User               @relation(fields: [userId], references: [id], onDelete: Cascade)
  plan               PlanType
  status             SubscriptionStatus
  stripeCustomerId   String
  stripeSubscriptionId String           @unique
  currentPeriodEnd   DateTime?
  trialEndsAt        DateTime?
  cancelScheduled    Boolean            @default(false)
  createdAt          DateTime           @default(now())
  updatedAt          DateTime           @updatedAt
}
```

No card fields anywhere on this model — confirmed hard requirement, see
requirements.md.

## API surface

| Method | Path | Auth | Request DTO | Response DTO | Error cases |
|---|---|---|---|---|---|
| GET | `/subscriptions/plans` | none | — | `PlanDto[]` | — |
| GET | `/subscriptions/me` | Bearer | — | `SubscriptionDto \| null` | 401 |
| POST | `/subscriptions/checkout` | Bearer | `{ plan: "MONTHLY" \| "ANNUAL" }` | `{ checkoutUrl: string }` | 400, 401 |
| POST | `/subscriptions/cancel` | Bearer | — | `SubscriptionDto` | 401, 404 |
| POST | `/subscriptions/reactivate` | Bearer | — | `SubscriptionDto` | 401, 404 |
| POST | `/webhooks/stripe` | Stripe signature (not Bearer) | raw Stripe event | 200 | 400 (bad signature) |

The webhook route is registered with `express.raw()` body parsing (not
the global JSON body parser) — required for Stripe signature verification
— documented explicitly since it's the one endpoint in the whole API that
deviates from the standard JSON pipeline.

`StripeService` wraps the Stripe SDK: `createCheckoutSession(userId,
plan)`, `cancelAtPeriodEnd(subscriptionId)`,
`undoCancelAtPeriodEnd(subscriptionId)`, `verifyWebhookSignature(payload,
signature)`. `SubscriptionsService` owns the local DB sync logic, calling
into `StripeService` for anything Stripe-side.

## Mobile screens

| Screen | Route | Reads | Writes | Notes |
|---|---|---|---|---|
| `PlansScreen` | `/plans` | `GET /subscriptions/plans`, `GET /subscriptions/me` | `POST /subscriptions/checkout` | Opens `checkoutUrl` via `expo-web-browser`'s `openAuthSessionAsync`; on return, refetches `GET /subscriptions/me` |
| Subscription status card | on `ProfileScreen` (extends `user-profile`) | `GET /subscriptions/me` | `POST /subscriptions/cancel`, `POST /subscriptions/reactivate` | Status label mirrors legacy copy: "Active", "Trial", "Cancellation Scheduled", "Payment Pending", "Canceled" |

## Shared types

`packages/shared-types/src/subscription.ts`: `Plan`, `Subscription`,
`SubscriptionStatus`, `PlanType`.

## Error handling

- Checkout URL open failure (user backs out of the browser) → app just
  refetches `GET /subscriptions/me`; if still no active subscription,
  no error is shown, the plans screen simply stays as-is.
- Webhook signature failure → 400, logged server-side, never exposed to
  the mobile client (this is a Stripe-to-server call, not user-facing).
