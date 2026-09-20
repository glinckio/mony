# Tasks — Subscriptions

## API

- [ ] Prisma: `Subscription` model, `PlanType`/`SubscriptionStatus` enums, migration
- [ ] Install `stripe` SDK
- [ ] `StripeService`: checkout session creation, cancel/reactivate,
      webhook signature verification
- [ ] `SubscriptionsModule`, `SubscriptionsController`, `SubscriptionsService`
- [ ] Webhook route with raw-body parsing (not global JSON pipeline)
- [ ] DTOs with validation + `@ApiProperty` examples
- [ ] Swagger decorators on all six endpoints
- [ ] Update `docs/postman/collection.json` with examples (webhook
      documented as "not callable from Postman directly — see Stripe CLI
      `stripe trigger` for local testing", still list the expected payload
      shape as a reference example)
- [ ] Unit tests: checkout session creation, webhook status sync (each
      event type), cancel/reactivate flows
- [ ] E2E tests: checkout → simulate webhook event (Stripe test mode or a
      signed fixture payload) → verify `GET /subscriptions/me` reflects it

## Shared types

- [ ] `packages/shared-types/src/subscription.ts`

## Mobile

- [ ] Install `expo-web-browser`
- [ ] `PlansScreen`
- [ ] Subscription status card on `ProfileScreen`
- [ ] Unit tests: status label mapping
- [ ] Maestro flow: `e2e/flows/subscriptions.yaml` — open plans screen,
      trigger checkout (use Stripe test-mode card in the E2E environment)

## Review gates

- [ ] `lgpd-security-reviewer` — hard block: no card data anywhere, this
      is the highest-severity review in the whole roadmap
- [ ] `code-reviewer`
- [ ] `api-contract-guardian`
- [ ] Lint + typecheck clean, all tests green
- [ ] `workflow-guardian` — commit message(s) drafted
