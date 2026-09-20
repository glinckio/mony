# Tasks — Dashboard

## API

- [ ] `DashboardModule`, `DashboardController`
- [ ] `DashboardService`: composes `TransactionsService` summary logic +
      previous-period comparison + `averageDailyExpense` + yearly
      breakdown query + incomplete-goals query (reuses `GoalsService`)
- [ ] Query DTO for `period`/`dateFrom`/`dateTo` with validation
- [ ] Swagger decorators
- [ ] Update `docs/postman/collection.json` with a dashboard example
- [ ] Unit tests: period comparison math, average daily expense, yearly
      breakdown shape, empty-state (zero transactions) doesn't error
- [ ] E2E test: dashboard reflects transactions + goals created in prior
      feature flows

## Shared types

- [ ] `packages/shared-types/src/dashboard.ts`

## Mobile

- [ ] `DashboardScreen` (home tab): summary card, period selector,
      comparison badge, goals preview, yearly chart (use a lightweight RN
      chart lib — pick one during implementation, e.g. `victory-native` or
      `react-native-gifted-charts`; record the choice in `tech.md` once made)
- [ ] Unit tests: period selector state, empty-state rendering
- [ ] Maestro flow: `e2e/flows/dashboard.yaml` — open app, assert summary
      figures match transactions created in the `transactions` E2E flow

## Review gates

- [ ] `code-reviewer` — no duplicated summary SQL (must reuse `TransactionsService`)
- [ ] `api-contract-guardian`
- [ ] `performance-auditor` — yearly breakdown query cost, N+1 on goals
- [ ] Lint + typecheck clean, all tests green
- [ ] `workflow-guardian` — commit message(s) drafted
