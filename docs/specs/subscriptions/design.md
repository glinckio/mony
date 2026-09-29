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

model User {
  // …
  // Created on the first checkout; reused afterwards.
  stripeCustomerId String?       @unique @db.VarChar(255)
  subscription     Subscription?
}

// One row per user: the latest Stripe subscription, mirrored from Stripe.
model Subscription {
  id                   String             @id @default(uuid())
  userId               String             @unique
  user                 User               @relation(fields: [userId], references: [id], onDelete: Cascade)
  plan                 PlanType
  status               SubscriptionStatus
  stripeSubscriptionId String             @unique @db.VarChar(255)
  // Stripe's own `created` — decides which subscription wins when an old
  // one's late event arrives after a newer one exists.
  stripeCreatedAt      DateTime
  currentPeriodEnd     DateTime?
  trialEndsAt          DateTime?
  cancelScheduled      Boolean            @default(false)
  createdAt            DateTime           @default(now())
  updatedAt            DateTime           @updatedAt
}
```

No card fields anywhere (hard requirement). Legacy `assinaturas` kept the
card's last 4 digits and brand; the rebuild doesn't — the Customer Portal
shows the card to the user when they need it.

Status mapping (Stripe → local): `trialing` → TRIALING; `active` →
ACTIVE; `past_due`, `unpaid`, `incomplete`, `paused` → PAST_DUE ("payment
pending": the portal fixes it); `canceled`, `incomplete_expired` →
CANCELED. `cancelScheduled` = `cancel_at_period_end` (or a `cancel_at`
set). `currentPeriodEnd` comes from the subscription **item**
(`items.data[0].current_period_end`) — Stripe moved it off the
subscription in API 2025-03-31. `plan` from the item's price id
(`STRIPE_PRICE_MONTHLY` / `STRIPE_PRICE_ANNUAL`).

## API surface

| Method | Path                        | Auth             | Request                             | Response                                                                                    | Errors                                           |
| ------ | --------------------------- | ---------------- | ----------------------------------- | ------------------------------------------------------------------------------------------- | ------------------------------------------------ |
| GET    | `/subscriptions/plans`      | none             | —                                   | `PlanDto[]`                                                                                 | 503 (Stripe not configured)                      |
| GET    | `/subscriptions/me`         | Bearer           | —                                   | `{ subscription: SubscriptionDto \| null }` (wrapped: a bare `null` would be an empty body) | 401                                              |
| POST   | `/subscriptions/checkout`   | Bearer           | `{ plan: "MONTHLY" \| "ANNUAL" }`   | `{ url }`                                                                                   | 400, 401, 409 (already subscribed), 502, 503     |
| POST   | `/subscriptions/cancel`     | Bearer           | —                                   | `SubscriptionDto`                                                                           | 401, 404 (no active subscription), 502, 503      |
| POST   | `/subscriptions/reactivate` | Bearer           | —                                   | `SubscriptionDto`                                                                           | 401, 404 (nothing scheduled to cancel), 502, 503 |
| POST   | `/subscriptions/portal`     | Bearer           | —                                   | `{ url }`                                                                                   | 401, 404 (no Stripe customer), 502, 503          |
| GET    | `/subscriptions/return`     | none             | `?result=success\|canceled\|portal` | 302 → `mony://subscription?result=…`                                                        | —                                                |
| POST   | `/webhooks/stripe`          | Stripe signature | raw Stripe event                    | 200 `{ received: true }`                                                                    | 400 (missing/invalid signature)                  |

`PlanDto`: `plan, amount (decimal string, BRL), currency, interval
("month" | "year"), trialDays` (no Stripe price id). Read from Stripe
(`prices.retrieve`) and cached in memory for 1 h; concurrent misses share
one round trip, and while Stripe fails the last good list is served (a
failure is remembered for 30 s).

`SubscriptionDto`: `plan, status, currentPeriodEnd, trialEndsAt,
cancelScheduled, updatedAt`. Never Stripe ids.

**Checkout**: 409 if the local row is live. Then, because that row only
appears once the webhook lands, Stripe is asked too
(`subscriptions.list({ customer, status: "all" })`): a live one there
(any status not mapping to CANCELED) is synced and answered with 409; the
trial is granted only when there's neither a local row nor any Stripe
subscription. Then `checkout.sessions.create({ mode: "subscription",
customer, payment_method_types: ["card"], line_items: [{ price, quantity:
1 }], subscription_data: { metadata: { userId }, trial_period_days: 7 },
success_url, cancel_url })`. Card only: other methods (e.g. Boleto) would
have Stripe collect CPF and address. Customer: created on first checkout
with **only** the email and `metadata.userId` (the holder's name is
collected by Checkout; the metadata lets account deletion find every
customer of a user), with idempotency key `customer-create-{userId}` so
parallel first checkouts get the same customer, and stored on
`User.stripeCustomerId` (`updateMany where stripeCustomerId: null`).

**Return URL**: Stripe needs http(s) URLs, the app needs its scheme. So
`success_url`/`cancel_url`/portal `return_url` point at `GET
{API_PUBLIC_URL}/subscriptions/return?result=…`, which answers a 302 to
`mony://subscription?result=…`; the app opens Checkout with
`WebBrowser.openAuthSessionAsync(url, "mony://subscription")`, which
closes the in-app browser on that redirect (ephemeral session on iOS: no
Safari cookies, no "sign in" prompt). No data travels in the URL.
`result` is read as a plain `@Query` string, not a DTO: anything outside
the allowlist becomes `canceled` instead of a 400, since the browser has
to land in the app either way. `API_PUBLIC_URL` is required and must be
`https://` in production (startup error otherwise).

**Webhook**: `/webhooks/stripe` needs the raw body for the signature, so
the app is created with `rawBody: true` and the handler reads
`req.rawBody` (the one route outside the JSON pipeline; no JWT guard, not
throttled; hidden from Swagger with `@ApiExcludeController` — it's for
Stripe, not for clients). Handled events: `checkout.session.completed`,
`customer.subscription.created|updated|deleted`, `invoice.paid`,
`invoice.payment_failed`. Each yields a subscription id → `subscriptions.retrieve`
→ `syncFromStripe(subscription)`. Others are acknowledged and ignored.
Invoice payloads follow the webhook **endpoint's** API version: the id is
read from `parent.subscription_details.subscription` (2025-03-31+) or,
failing that, the top-level `subscription`. The re-read happens outside
the lock (no network call inside a DB transaction), so a slow handler may
write a slightly older snapshot of the same subscription; the next event
for it corrects that.

**syncFromStripe(sub)**: owner = `sub.metadata.userId` only if that user's
`stripeCustomerId` equals `sub.customer` (a user without a customer never
checked out, so owns nothing); else the user with `stripeCustomerId =
sub.customer` (unknown → log + ignore). Under a per-user advisory lock
(`pg_advisory_xact_lock(hashtext(userId))` — there's no row to lock on
the first subscription, exactly when Stripe sends several events at once),
upsert by `userId` if there's no row or the ids match; otherwise a live
subscription beats one that isn't (someone holding two must see the one
that still charges), and between equals the newer `stripeCreatedAt` wins —
a late event for an old, replaced subscription can't overwrite the
current one.

**Cancel / reactivate**: cancel → `subscriptions.update(id, {
cancel_at_period_end: true })`. Reactivate undoes either kind of scheduled
cancellation: `cancel_at_period_end: false` when that's set, else
`cancel_at: ""` (a date set from the Dashboard / Portal). Then
`syncFromStripe` with the returned object (the webhook repeats it
harmlessly). If Stripe refuses (e.g. it already ended the subscription and
that webhook got lost), the subscription is re-read and synced before
answering 502, so the next `/me` is right.

**Portal**: `billingPortal.sessions.create({ customer, return_url })`.

### Stripe wiring

`src/subscriptions/stripe/`: `StripeGateway` (abstract: `priceId`,
`planOfPrice`, `retrievePrice`, `createCustomer`, `createCheckoutSession`,
`retrieveSubscription`, `listSubscriptions`, `scheduleCancel`,
`undoScheduledCancel`, `createPortalSession`, `parseWebhook`), provided by
`StripeModule` like `MailerModule`/`StorageModule`:

- `StripeSdkGateway` — the `stripe` package with the SDK's pinned API
  version (`2026-08-26.dahlia`), 10 s timeout and one retry, when
  `STRIPE_SECRET_KEY` is set (a warning if it's a test key in production);
- `FakeStripeGateway` — in-memory, used when `NODE_ENV=test` (unit and
  e2e never call Stripe; webhooks are signed with the fake secret);
- dev without a key → `UnconfiguredStripeGateway` answering 503 ("Payments
  aren't configured."); production without the keys → startup error.

Env: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_MONTHLY`,
`STRIPE_PRICE_ANNUAL`, `API_PUBLIC_URL` (base of the return URL; the
phone must reach it — dev: LAN IP). Register the webhook endpoint on the
SDK's API version, for the 6 handled events only.

## Mobile screens

| Screen               | Route                                      | Reads                                               | Writes                                         | Notes                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| -------------------- | ------------------------------------------ | --------------------------------------------------- | ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `SubscriptionScreen` | stack `Subscription` (Mais → "Assinatura") | `GET /subscriptions/plans`, `GET /subscriptions/me` | `POST checkout / cancel / reactivate / portal` | Status card on top (legacy copy: "Em período de teste", "Ativa", "Cancelamento agendado", "Pagamento pendente", "Cancelada", "Sem assinatura", with the renewal/end date); the two plans as cards (annual highlighted: "Melhor valor", monthly-equivalent price and savings), "Começar 7 dias grátis" / "Assinar"; cancel via `ConfirmSheet`; "Reativar"; "Gerenciar pagamento" (portal) whenever there's a live subscription (trial, active, pending) |

After the browser closes the screen refetches `/subscriptions/me`; since
the webhook can lag a few seconds, after a success return it polls (every
2 s) until the subscription is live or 20 s pass, with "Confirmando seu
pagamento…" and the checkout button disabled. If the window runs out, a
neutral notice says the confirmation may take a few minutes (the button
comes back; the API's Stripe-side 409 prevents a second subscription).
Layout (refined 2026-09-29, `design/telas.md` §28): a `SubscriptionHero`
in the brand gradient (status chip; the live plan with price, trial bar
and date, or the trial offer with what the plan includes), the plans as
`PlanCard` radios (annual first), a `TrialTimeline` for first-time
subscribers and the CTA fixed in the `ScrollScreen` footer; a live
subscription gets its actions as `MenuRow`s. Plans are read aloud with
`spokenMoney`. Stripe's dates are shown as the phone's local day. A failed
cancel shows its error inside the `ConfirmSheet`. Any 409 or failed
cancel/reactivate refetches `/me`. The footnote tells the user their email
is shared with Stripe. Copy is pt-BR; API errors are never shown raw (409
→ "Você já tem uma assinatura."; 503 → "Pagamentos indisponíveis no
momento. Tente mais tarde."; anything else → "Algo deu errado. Tente
novamente.").

## Shared types

`packages/shared-types/src/subscription.ts`: `PLAN_TYPES`,
`SUBSCRIPTION_STATUSES`, `TRIAL_DAYS`, `planSchema`, `subscriptionSchema`,
`checkoutInputSchema`, inferred types.

## Error handling

- Stripe API errors → 502 "Payment provider error." (logged with only the
  error's `type`, `code`, status and request id — never its message, which
  can echo input like an email, nor the payload); the app shows generic
  pt-BR copy.
- Webhook signature failure → 400, logged; never user-facing.
- Browser dismissed without paying → nothing changes, no error shown.
