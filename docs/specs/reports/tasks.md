# Tasks — Reports

## API

- [ ] `ReportsModule`, `ReportsController`, `ReportsService`
- [ ] Query DTO (`dateFrom`/`dateTo`) with validation
- [ ] Monthly summary, category totals, daily running balance, top-5
      income categories, trailing-12-months, weekday distribution queries
      — all expense aggregation filtered to `status=PAID` (comment linking
      to `product.md` decision)
- [ ] Swagger decorators
- [ ] Update `docs/postman/collection.json` with a reports example
- [ ] Unit tests: each sub-report's math independently, running-balance
      accumulation correctness, status=PAID filtering applied everywhere
- [ ] E2E test: reports reflect transactions created across prior feature
      flows (mixed paid/pending expenses — assert pending is excluded)

## Shared types

- [ ] `packages/shared-types/src/report.ts`

## Mobile

- [ ] `ReportsScreen` (date-range picker, chart sections, reuses the
      charting library chosen in `dashboard`)
- [ ] Unit tests: empty-state rendering, date-range validation
- [ ] Maestro flow: `e2e/flows/reports.yaml` — open reports, change date
      range, verify sections render

## Review gates

- [ ] `code-reviewer` — confirms `status=PAID` filtering is applied in
      every sub-report, not just some (this is the exact bug being fixed)
- [ ] `api-contract-guardian`
- [ ] `performance-auditor` — daily running-balance loop cost over long ranges
- [ ] Lint + typecheck clean, all tests green
- [ ] `workflow-guardian` — commit message(s) drafted
