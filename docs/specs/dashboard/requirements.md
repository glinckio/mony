# Requirements — Dashboard

## Summary

The app's home screen: financial summary for a selectable period, period-
over-period comparison, average daily expense, up to 3 incomplete goals,
and a full-year monthly income-vs-expense chart. Matches legacy scope —
debt/maintenance alert widgets are explicitly NOT included here (see
`product.md` decisions table).

## User stories

- As a user, I want to see my income, expenses, and balance for the
  current month (or a period I pick) as soon as I open the app.
- As a user, I want to see how this period compares to the previous one.
- As a user, I want a quick glance at my active goals' progress.
- As a user, I want a full-year chart of income vs. expenses.

## Acceptance criteria (EARS)

- WHEN a user opens the dashboard, THE SYSTEM SHALL default the period to
  the current calendar month and show: `totalIncome`,
  `totalExpensesPaid`, `totalExpensesPending`, `balance`,
  `expenseRatio` (`totalExpensesPaid / totalIncome`, 0 if income is 0).
- WHEN a period is selected (day/week/month/custom range), THE SYSTEM
  SHALL recompute the summary for that exact range plus the immediately
  preceding equivalent-length period, returning a percentage variation on
  income.
- THE SYSTEM SHALL compute `averageDailyExpense` = paid expenses in range
  ÷ number of days in range.
- WHEN a user requests dashboard data, THE SYSTEM SHALL include up to 3
  incomplete goals (`completed=false`), ordered by `targetDate` ascending,
  scoped to the active workspace.
- THE SYSTEM SHALL provide a full current-calendar-year (Jan–Dec)
  income-vs-expense-paid breakdown by month, independent of the selected
  period filter.
- All figures are scoped to the user's `activeWorkspace`.

## Out of scope

- Debt-due-soon and maintenance-due alert widgets — deliberately not
  added here, matches legacy (see `product.md`).
- Unread-changelog banner — belongs to the `changelog` feature (added
  there once that spec lands; this dashboard spec's screen leaves a slot
  for it but doesn't implement the fetch/mark-read logic).

## Open questions

- None blocking.
