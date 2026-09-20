# Requirements — Transactions

## Summary

Income and expense entries, scoped to the user's active workspace.
Expenses can be `PAID` or `PENDING`; income is always `PAID` on creation
(matches legacy exactly). Supports one-shot fixed-duration recurring
generation (not an ongoing cron series — matches legacy).

## User stories

- As a user, I want to record income and expenses with a category, amount,
  date, and description.
- As a user, I want to mark an expense as paid or pending, and toggle it
  later.
- As a user, I want to create a recurring expense/income that
  auto-generates future months' entries, so I don't re-enter rent every
  month.
- As a user, I want to filter/search my transactions by type, category,
  date range, status, and text.
- As a user, I want to delete one or several transactions at once.

## Acceptance criteria (EARS)

- WHEN a user creates a transaction, THE SYSTEM SHALL require `categoryId`
  (must belong to that user or be a system category, and match the
  transaction's `type`), `description` (1–255 chars), `amount` (> 0),
  `date`, `type` (`INCOME` | `EXPENSE`).
- IF `type = INCOME`, THEN THE SYSTEM SHALL force `status = PAID`
  regardless of what's submitted (matches legacy — income is always
  realized).
- IF `type = EXPENSE`, THEN THE SYSTEM SHALL accept `status` as `PAID` or
  `PENDING` (default `PENDING` if omitted).
- WHEN a user creates a transaction with `recurring = true` and
  `recurringMonths` (1–60), THE SYSTEM SHALL create that many total
  transactions: the original plus `recurringMonths - 1` future copies, one
  per month, each with description suffixed `" (N/total)"`. Only the
  first row is flagged `recurring = true`; generated copies are
  independent rows (no series link — matches legacy exactly, including
  the lack of a series ID). Future expense copies default `status =
  PENDING`; future income copies are `status = PAID`.
- WHEN a user changes an expense's status, THE SYSTEM SHALL reject the
  change with 400 if the transaction's `type != EXPENSE` ("Only expenses
  can have their status changed.").
- WHEN a user requests a financial summary for a period + workspace, THE
  SYSTEM SHALL compute: `totalIncome` = sum of all `INCOME`;
  `totalExpensesPaid` = sum of `EXPENSE` where `status=PAID`;
  `totalExpensesPending` = sum of `EXPENSE` where `status=PENDING`;
  `balance = totalIncome - totalExpensesPaid` (pending expenses excluded
  — matches legacy dashboard/summary logic, and fixes the Reports-module
  inconsistency noted in `product.md`).
- THE SYSTEM SHALL support listing with pagination (default 20/page),
  filters (`type`, `categoryId`, `dateFrom`, `dateTo`, `status`, `search`
  on description), and sorting restricted to an allow-list (`date`,
  `amount`, `description`) to prevent injection via sort field.
- WHEN a user deletes one or several transactions, THE SYSTEM SHALL verify
  ownership per row and delete in one all-or-nothing operation for bulk
  delete.

## Out of scope

- Editing/canceling "a whole recurring series" as a unit — matches legacy;
  each generated row is edited/deleted individually.
- Linking a transaction to a Debt installment automatically from this
  screen — that link is created by the `debts` feature, not here.

## Open questions

- None blocking.
