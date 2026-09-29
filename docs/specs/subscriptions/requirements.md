# Requirements — Subscriptions

## Summary

Two plans (monthly/annual) with a 7-day free trial, paid through Stripe
Checkout opened from the app; the local subscription status is synced
from Stripe webhooks. No feature gating (matches legacy — see
`product.md`; both plans are functionally identical and the status does
not unlock or restrict anything). Card data never touches the API: Stripe
hosts the payment page and the API only keeps Stripe's customer and
subscription ids.

Legacy (`planos.php`): Mensal R$ 9,90/mês and Anual R$ 65,34/ano, both
"inclui 7 dias de teste grátis", Stripe Checkout sessions — but payments
were switched off ("temporariamente indisponíveis") and `assinaturas` has
no rows, so there is nothing to migrate.

Owner decisions (2026-09-28):

- **Stripe Checkout as specified**, accepting the app-store risk: selling
  a digital subscription from inside the app normally requires Apple In-App
  Purchase / Google Play Billing. In Brazil (2026) Apple allows linking out
  to an external payment page (CADE settlement; commission on linked-out
  purchases) and Google offers "user choice billing" through its
  alternative-billing APIs — neither is "a plain link to Stripe". Store
  review may require changes later (e.g. adding store billing alongside).
- Prices and trial as legacy: R$ 9,90/month, R$ 65,34/year, 7-day trial.
- Trial once per user (2026-09-29): this rule is ours, not legacy's —
  legacy's checkout code was removed and its copy ("ao assinar qualquer
  plano… 7 dias") didn't restrict it. Kept by the owner so canceling and
  subscribing again doesn't buy another free week. The CTA copy
  "Começar 7 dias grátis" is also new (legacy's button was disabled).

## User stories

- As a user, I want to see the plans and their prices.
- As a user, I want to subscribe through a secure hosted checkout, with a
  7-day free trial the first time.
- As a user, I want to see my subscription status (trial, active,
  scheduled to cancel, payment pending, canceled) and when it renews or
  ends.
- As a user, I want to cancel (at the end of the period) and undo that
  before it takes effect.
- As a user whose payment failed, I want to update my payment method.

## Acceptance criteria (EARS)

- WHEN anyone requests the plan list, THE SYSTEM SHALL return the two
  plans (Monthly, Annual) with their price and interval as configured in
  Stripe, and the trial length.
- WHEN a user starts checkout for a plan, THE SYSTEM SHALL create (or
  reuse) the user's Stripe customer and a Stripe Checkout Session in
  subscription mode, and return its URL. The app opens it in an in-app
  browser; it never shows a card form of its own.
- THE SYSTEM SHALL grant the 7-day trial only to a user who never had a
  subscription — locally or on Stripe (the local row lags the webhook).
- IF the user already has a trialing, active or past-due subscription —
  locally or on Stripe (a checkout just finished, or on another device) —
  THEN THE SYSTEM SHALL refuse a new checkout (409), syncing the one found
  on Stripe first.
- WHEN Stripe sends a webhook event, THE SYSTEM SHALL verify its signature
  (400 otherwise), and for subscription-related events fetch the current
  subscription from Stripe and upsert the user's local row (status, plan,
  current period end, trial end, scheduled cancellation) — so events can
  arrive late, twice or out of order without corrupting the state.
- WHEN a user requests cancellation, THE SYSTEM SHALL ask Stripe to cancel
  at the period end (never immediately) and return the updated status.
- WHEN a user reactivates a subscription scheduled to cancel, THE SYSTEM
  SHALL ask Stripe to undo the scheduled cancellation, whether it was set
  for the period end or for a date (Dashboard / Customer Portal).
- IF Stripe refuses a cancel or reactivate, THEN THE SYSTEM SHALL re-sync
  the subscription from Stripe (the local row may be stale) and answer 502.
- WHEN a user asks to manage billing, THE SYSTEM SHALL return a Stripe
  Customer Portal URL (update the card, see invoices) — the way out of
  "payment pending".
- THE SYSTEM SHALL NEVER store a card number, CVV or full PAN — only
  Stripe's customer and subscription ids.
- THE SYSTEM SHALL send Stripe only the user's email and internal id, and
  accept card payments only (no method that makes Stripe collect CPF or an
  address); the app tells the user the email is shared with Stripe
  (`product.md` → Data sharing).
- THE SYSTEM SHALL NOT gate any other feature on the subscription status.

## Out of scope

- Feature gating (legacy decision, `product.md`).
- Store billing (Apple IAP / Play Billing) — see the owner decision above.
- Changing plans (monthly ↔ annual) in-app: done through the Customer
  Portal if enabled there, or by canceling and subscribing again.
- Account deletion deleting the Stripe customer (which cancels its
  subscriptions), the data export's subscription part, and syncing email
  changes to Stripe: Release hardening (`roadmap.md`).

## Open questions

- Stripe account: the owner creates the two prices (BRL) in Stripe and
  sets `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_MONTHLY`,
  `STRIPE_PRICE_ANNUAL` (test mode first). Until then the endpoints answer
  503 in development.
