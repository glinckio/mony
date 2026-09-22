# Tasks — Dashboard

## API

- [x] `DashboardModule`, `DashboardController`
- [x] `DashboardService`: composes `TransactionsService` summary logic +
      previous-period comparison + `averageDailyExpense` + yearly
      breakdown query + incomplete-goals query (reuses `GoalsService`)
- [x] Query DTO for `period`/`dateFrom`/`dateTo` with validation
- [x] Swagger decorators
- [x] Update `docs/postman/collection.json` with a dashboard example
- [x] Unit tests: period comparison math, average daily expense, yearly
      breakdown shape, empty-state (zero transactions) doesn't error
- [x] E2E test: dashboard reflects transactions + goals created in prior
      feature flows

## Shared types

- [x] `packages/shared-types/src/dashboard.ts`

## Mobile

- [x] `DashboardScreen` (home tab): summary card, period selector,
      comparison badge, goals preview, yearly chart — chart lib decided:
      `react-native-gifted-charts` (recorded in `tech.md`)
- [x] Unit tests: period selector state, empty-state rendering
- [x] Maestro flow: `e2e/flows/dashboard.yaml` — open app, assert summary
      figures match transactions created in the `transactions` E2E flow

## Review gates

- [x] `code-reviewer` — no duplicated summary SQL (reuses `TransactionsService`/
      `GoalsService`). Flagged a real conflict between `structure.md`'s
      module-boundary rule and `design.md`'s explicit sanction of
      DashboardModule importing other feature services directly — resolved
      by amending `structure.md` with an explicit composition/read-model
      exception (dashboard has no domain logic of its own, only aggregates).
- [x] `api-contract-guardian` — PASS, no changes needed
- [x] `lgpd-security-reviewer` — clean, no blockers (financial-data
      aggregation feature, reviewed per product.md's sensitive-data scope)
- [x] `performance-auditor` — flagged 3x redundant `activeWorkspace`
      lookups per request (TransactionsService.summary, GoalsService.list,
      and DashboardService itself each re-fetching it independently) —
      fixed by threading an optional pre-resolved `workspace` param through
      `summary()`/`list()`, with a regression test on each confirming the
      lookup is skipped when it's provided. Everything else (yearly
      breakdown single-query, goals sort/slice in JS, custom-date debounce
      via `enabled`, N+1 check) confirmed fine.
- [x] Lint + typecheck clean, all tests green (API 99 unit / 62 e2e,
      mobile 53, shared-types 55)
- [ ] `workflow-guardian` — commit message(s) drafted
