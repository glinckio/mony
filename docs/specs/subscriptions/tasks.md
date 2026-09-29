# Tasks — Subscriptions

## Shared types

- [x] `packages/shared-types/src/subscription.ts` + tests

## API

- [x] Prisma: `PlanType`, `SubscriptionStatus`, `Subscription`,
      `User.stripeCustomerId`; migration
- [x] `stripe` dependency; `StripeModule` with SDK / fake (test) /
      unconfigured (dev, 503) gateways; production startup check (the 4
      Stripe keys, `API_PUBLIC_URL` https, warning on a test key)
- [x] `SubscriptionsService`: plans (cached, single-flight, stale on
      failure), me, checkout (customer reuse, 409 and trial-once checked
      on Stripe too), cancel, reactivate (period end or date), portal,
      `syncFromStripe` (status mapping, item-level period end, live beats
      ended then newer-wins, per-user advisory lock), re-sync on a refused
      change
- [x] Controllers: `/subscriptions/*`, `GET /subscriptions/return`
      (302 to the app scheme), `POST /webhooks/stripe` (raw body,
      signature, no JWT, not throttled); `rawBody: true` in `main.ts`
- [x] `.env.example`: Stripe keys, price ids, `API_PUBLIC_URL`, webhook
      endpoint version and events
- [x] Swagger on every endpoint; Postman examples (folder
      "Subscriptions", responses captured from the app running on the
      fake gateway, with Checkout/Portal URLs shaped like Stripe
      test-mode ones)
- [x] Unit tests: status mapping, sync ranking, event → subscription id
      (both invoice shapes), snapshot, `StripeModule` factory. Trial-once
      and customer reuse are covered by the e2e (they need the DB).
- [x] E2E (fake gateway): plans, checkout → signed webhook → me, 409 on
      second checkout (local and Stripe-side), cancel/reactivate (incl. a
      `cancel_at` date), portal, bad signature 400, late event for an old
      subscription ignored, metadata/customer cross-check, trial-once by
      Stripe history, stale-row re-sync, other user isolation, 502

## Mobile

- [x] `SubscriptionScreen` + "Assinatura" row in Mais; navigation
- [x] Checkout / portal via `WebBrowser.openAuthSessionAsync` (ephemeral
      on iOS); refetch + polling after a success return (20 s window, then
      a "taking longer" notice)
- [x] `PlanCard` domain component (spoken price and saving)
- [x] Mock API routes, catalog entry, `design/telas.md` spec
- [x] Unit tests: status copy, local-day dates, plan cards, cancel (error
      inside the sheet) / reactivate flows, 409/503 copy
- [x] Maestro flow `e2e/flows/subscription.yaml` (Mais → Assinatura →
      plans, annual preselected, trial CTA; needs the STRIPE\_\* test keys
      in the API). Written, not run yet; the CTA isn't tapped (the
      Stripe-hosted page isn't scriptable)
- [ ] On a device: Android return from Stripe closes the in-app browser
      (needs a dev/EAS build — `mony://` isn't registered in Expo Go)

## Review gates

- [x] `code-reviewer`
- [x] `api-contract-guardian` (Swagger fixed by the agent; its run was
      stopped before Postman, which was then added by hand)
- [x] `lgpd-security-reviewer` (Stripe data sharing, webhook security;
      Release-hardening items added to `roadmap.md`)
- [x] `performance-auditor`
- [x] `qa-engineer` (`StripeModule` spec; screen tests for the 409
      refetch, the disabled CTA while confirming, the late notice after
      the poll window and the plan cards' spoken labels; Maestro flow)
- [x] Lint + typecheck clean, all tests green
- [x] `workflow-guardian` — commit message(s) drafted
