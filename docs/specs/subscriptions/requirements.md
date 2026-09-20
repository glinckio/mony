# Requirements — Subscriptions

## Summary

Two plans (monthly/annual), Stripe Checkout for payment, webhook-driven
status sync. No tiered feature gating (matches legacy — see
`product.md`; both plans are functionally identical today). Never stores
raw card data — Stripe handles all PCI-scoped data, the API only ever
sees a Stripe customer/subscription id.

## User stories

- As a user, I want to see the available plans and subscribe via a secure
  checkout.
- As a user, I want to see my current subscription status (active,
  trialing, past due, canceled, scheduled-to-cancel).
- As a user, I want to cancel my subscription (scheduled for end of
  period) and reactivate before it takes effect.

## Acceptance criteria (EARS)

- WHEN a user requests the plan list, THE SYSTEM SHALL return the two
  fixed plans (Monthly, Annual) with pricing metadata — no per-user
  computation.
- WHEN a user starts checkout, THE SYSTEM SHALL create a Stripe Checkout
  Session server-side and return its URL — the mobile app opens it in an
  in-app browser (`expo-web-browser`), never re-implements a card form.
- WHEN Stripe sends a webhook event (`checkout.session.completed`,
  `customer.subscription.updated`, `customer.subscription.deleted`), THE
  SYSTEM SHALL verify the webhook signature, then upsert the local
  `Subscription` row's `status`, `currentPeriodEnd`,
  `cancelScheduled` accordingly.
- WHEN a user requests cancellation, THE SYSTEM SHALL call Stripe to
  cancel-at-period-end (not immediately), and mark
  `cancelScheduled=true` locally pending webhook confirmation.
- WHEN a user reactivates a scheduled-cancellation subscription, THE
  SYSTEM SHALL call Stripe to undo the scheduled cancellation.
- THE SYSTEM SHALL NEVER store a card number, CVV, or full PAN anywhere —
  only Stripe's `customerId`/`subscriptionId` references (hard rule, see
  `product.md` LGPD section).
- THE SYSTEM SHALL NOT gate any other feature's endpoints based on
  subscription status in this version (matches legacy — see
  `product.md`).

## Out of scope

- Tiered feature gating (explicit legacy-matching decision).
- Any payment method other than Stripe Checkout (no native card form).

## Open questions

- None blocking. Payment gateway confirmed: **Stripe**.
