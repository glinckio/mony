# Tasks — Reports

## Shared types

- [x] `packages/shared-types/src/report.ts` (+ tests: query both-or-neither
      and order rules)

## API

- [x] `ReportsModule`, `ReportsController` (`GET /reports`),
      `ReportsService`
- [x] Query DTO (`dateFrom`/`dateTo`, format) → 400; both-or-neither and
      order in `resolveRange`
- [x] Queries: monthly (range), top-5 income / paid-expense categories,
      weekday, last 12 months — all aggregated in Postgres, every expense
      sum filtered to `status=PAID` (comment linking to `product.md`)
- [x] Swagger (query, response example, 400/401)
- [x] Postman: "Reports" folder with real examples (quarter, default
      month, half range, inverted range, 401) captured from the running
      API
- [x] Unit tests: range resolution, filling weekdays/12 months, ratio
      with zero income
- [x] E2E: mixed paid/pending expenses (pending excluded everywhere),
      workspace isolation, other-user isolation, empty range, top-5 cut,
      weekday and month grouping, last-12-months window (future entries
      excluded), 400s

## Mobile

- [x] Design pass (app-design): composition, domain chart components
      (`ReportHero`, `ColumnChart` + `ChartBar` — shared with `YearChart`
      —, `TrendChart`, `CategoryDonut`, `ReportMonthRow`),
      `design/telas.md` §29, `design/componentes.md`
- [x] `ReportsScreen` + "Relatórios" row in Mais + route
- [x] Mock API route + catalog entry
- [x] Unit tests: section math/copy helpers (ratio colors and messages,
      last-3-months cut, month labels, shares), date-range validation,
      empty state, error copy
- [x] Maestro flow `e2e/flows/reports.yaml`: create an income and a paid
      expense, open Relatórios, sections render, an empty range shows the
      empty state. Written, not run yet.
- [x] Visual review (2 rounds, `design/revisao.md`)

## Review gates

- [x] `code-reviewer` — `status=PAID` applied in every expense figure
      (fixed: pending-only months left out of `monthly`; weekday selection
      follows the range; report kept on screen while typing)
- [x] `api-contract-guardian` (Swagger: date formats, list sizes, icon
      example; Postman unchanged)
- [x] `performance-auditor` — query plans over long ranges; chart
      re-renders (fixed: no remount while typing, memoized sections and
      rows, stagger cap, `["reports"]` invalidation + 5 min staleTime;
      `plan_cache_mode` for production → roadmap Release hardening)
- [x] `lgpd-security-reviewer` (financial data; fixed: category lookup
      scoped to the user; `product.md` lists category names as personal
      data)
- [x] `qa-engineer` (service unit spec, chart component tests, boundary
      days, 400 bodies, per-section empty states, notebook switch, retry)
- [x] Lint + typecheck clean, all tests green
- [x] `workflow-guardian` — commit message(s) drafted
