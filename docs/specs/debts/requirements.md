# Requirements — Debts

## Summary

A debt split into equal installments (flat division — `interestRate` is
stored but never applied, see `product.md`). Each installment auto-creates
a linked expense `Transaction`; paying/unpaying an installment and its
linked transaction stay in sync bidirectionally. Matches legacy exactly.

## User stories

- As a user, I want to register a debt with a total amount and number of
  installments, and have those installments generated automatically.
- As a user, I want each installment to show up as an expense transaction
  too, so my totals stay accurate without double entry.
- As a user, I want to register a payment on an installment and have the
  debt's paid amount and status update automatically.
- As a user, I want to undo a payment if I marked it by mistake.

## Acceptance criteria (EARS)

- WHEN a user creates a debt with `totalAmount`, `totalInstallments` (> 0),
  `startDate`, THE SYSTEM SHALL split `totalAmount` evenly across
  `totalInstallments` (flat division, no interest applied even if
  `interestRate` is provided) and generate that many `DebtInstallment`
  rows: installment 1's due date = `startDate`, installment N's due date
  = `startDate + (N-1) months`.
- WHEN each installment is generated, THE SYSTEM SHALL also create a
  linked expense `Transaction` (description `"Installment {n}/{total} -
  {debtName}"`, category = the debt's category or a fallback default
  expense category), with `status = PAID` if the due date is on/before
  today, else `PENDING` — and store the transaction's id on the
  installment (`transactionId`).
- IF a debt has `paidInstallments > 0`, THEN THE SYSTEM SHALL reject a
  request to change `totalInstallments` with 400 ("Cannot change the
  number of installments once some are paid.").
- WHEN `totalInstallments` changes and none are paid yet, THE SYSTEM SHALL
  delete and regenerate all installments (and their linked transactions).
- WHEN `totalAmount` changes but `totalInstallments` doesn't, THE SYSTEM
  SHALL recalculate only *pending* installments as `(totalAmount -
  alreadyPaid) / remainingCount`; paid installments are untouched.
- WHEN a user registers payment on an installment (`paymentDate`,
  `paidAmount > 0`), THE SYSTEM SHALL: update the linked transaction to
  `status=PAID, date=paymentDate` (or create one if somehow missing), set
  the installment `status=PAID, paymentDate=...`, then recompute the
  parent debt's `paidAmount` (sum of paid installments),
  `paidInstallments` (count), and `status` (`PAID_OFF` if all paid,
  `OVERDUE` if any pending installment's due date is past, else
  `ACTIVE`). The installment's own `amount` is never overwritten by
  `paidAmount` (matches legacy — there is no separate "amount actually
  paid" field on the installment).
- WHEN a user cancels a payment, THE SYSTEM SHALL revert the linked
  transaction to `status=PENDING` (not delete it) and the installment to
  `status=PENDING, paymentDate=null`, then recompute the parent debt.
- `DebtStatus` is `ACTIVE` | `PAID_OFF` | `OVERDUE` only (no `CANCELLED`
  — dropped, see `product.md`).

## Out of scope

- Real amortization/interest calculation (see `product.md` decision —
  `interestRate` is informational only).
- Debt-due-soon alerts on the dashboard (see `product.md` — not surfaced
  there, matches legacy).

## Open questions

- None blocking.
