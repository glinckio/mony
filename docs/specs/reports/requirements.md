# Requirements — Reports

## Summary

Charts and aggregations over a date range: monthly summary, category
breakdowns, cumulative daily cash flow, top income categories, 12-month
trailing evolution, expense-by-weekday distribution. Fixes the legacy
inconsistency where Reports summed all expenses regardless of status —
this rebuild filters to `status=PAID` everywhere, matching the dashboard
(see `product.md`).

## User stories

- As a user, I want a monthly income/expense/balance summary for a date
  range.
- As a user, I want to see spending broken down by category.
- As a user, I want to see my cumulative balance trend over the period.
- As a user, I want to see my top income categories and a 12-month trend.

## Acceptance criteria (EARS)

- WHEN a user requests a report for a date range (default: current
  month), THE SYSTEM SHALL return, all filtered to
  `status=PAID` for expenses and scoped to `activeWorkspace`:
  - Monthly summary grouped by `YYYY-MM` within the range
  - Totals by category, split by `INCOME`/`EXPENSE`
  - Daily cumulative balance (`runningBalance`) computed by iterating the
    range day by day, accumulating `income - expensesPaid`
  - Top 5 income categories by total
  - Trailing 12-month income/expense evolution (always "last 11 months +
    current", independent of the selected date range — matches legacy)
  - Expense distribution by day-of-week
- IF `dateFrom > dateTo`, THEN THE SYSTEM SHALL return 400.

## Out of scope

- PDF/export generation (not in legacy for this screen).

## Open questions

- None blocking.
