# Requirements — Reports

## Summary

Legacy's "Relatórios Financeiros" (`relatorios.php`) for the active
workspace over a date range (default: the current month): the period
summary, income × expenses per month, the 12-month evolution, expenses
and income by category, expenses by weekday and the monthly table.
Reached from Mais → "Relatórios".

One deliberate fix vs. legacy (`product.md` → decisions): expenses count
only when **paid** (`status=PAID`), as on the dashboard. Legacy summed
every expense here.

Owner decisions (2026-09-29):

- **The six sections as legacy**, nothing added. Legacy's daily
  running balance (`$saldo_acumulado`) is computed but never shown —
  dead code, dropped (the earlier draft of this spec had it).
- **Period as legacy:** a start and an end date, default the current
  month. No presets.
- **Categories as legacy:** only the 5 largest of each type. The
  remainder isn't shown (the pie's percentages are of the top 5).

## User stories

- As a user, I want to pick a period and see how much came in, how much
  I paid out and what's left.
- As a user, I want to see where the money went (and came from) by
  category.
- As a user, I want to compare months and see the last 12 months'
  evolution.
- As a user, I want to know on which weekdays I spend the most.

## Acceptance criteria (EARS)

Scope: every figure is the caller's, in their **active workspace**.
"Income" is every `INCOME` transaction; "expenses" are `EXPENSE`
transactions with `status=PAID`. Dates are the transaction's date
(date-only).

- WHEN a user opens Relatórios, THE SYSTEM SHALL show the current month
  (first to last day).
- WHEN a user picks a start and an end date, THE SYSTEM SHALL report on
  that range, both ends included.
- IF only one of the two dates is given, or the start is after the end,
  THEN THE SYSTEM SHALL answer 400 (the app validates before asking).
- THE SYSTEM SHALL return, for the range:
  - **Period summary:** total income, total expenses, balance (income −
    expenses) and expenses as a percentage of income (0 when there's no
    income).
  - **Monthly summary:** one row per `YYYY-MM` that has transactions in
    the range, oldest first: income, expenses, balance.
  - **Top expense categories:** the 5 largest by total, largest first,
    with the category's name, color and icon.
  - **Top income categories:** the same for income.
  - **Expenses by weekday:** Sunday through Saturday, all seven, zero
    when none.
- THE SYSTEM SHALL return the **12-month evolution** independently of
  the range: income and expenses for each of the last 11 months and the
  current one, all twelve (zero when empty). Unlike legacy, months after
  the current one are left out — legacy had no upper bound, so future
  recurring entries leaked in as extra months.
- WHEN there are no transactions in the range, THE SYSTEM SHALL return
  zeros and empty lists, not an error; the app shows empty states.

Display rules (legacy's, kept as they are):

- The period summary's "Despesas em relação às receitas" bar is green up
  to 70%, amber up to 90%, red above, with legacy's three messages:
  "Sua situação financeira está controlada!", "Atenção! Suas despesas
  estão se aproximando do limite saudável." and "Alerta! Suas despesas
  estão superando suas receitas.".
- The monthly table's ratio is green up to 80%, amber up to 100%, red
  above (legacy uses different thresholds here; kept).
- "Receitas × despesas por mês" charts the **last 3 months** of the
  monthly summary, with the balance of each; the table lists all of
  them.
- Money in pt-BR (`R$ 1.234,56`), months as "set/2026".

## Out of scope

- Export (PDF/CSV): not in legacy's reports.
- Presets, comparisons with the previous period, pending expenses: not in
  legacy's reports (the dashboard has pending and the comparison).

## Open questions

- None blocking.
