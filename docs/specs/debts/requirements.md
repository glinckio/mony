# Requirements — Debts

## Summary

A debt split into equal installments (flat division — `interestRate` is
stored but never applied, see `product.md`). Each installment auto-creates
a linked expense `Transaction`; paying/unpaying an installment and its
linked transaction stay in sync bidirectionally. Matches legacy
(`processar_divida.php`, `funcoes_dividas.php`,
`funcoes_transacoes.php#atualizarStatusTransacao`), except where noted
under "Deliberate deviations from legacy" below.

## User stories

- As a user, I want to register a debt with a total amount and number of
  installments, and have those installments generated automatically.
- As a user, I want each installment to show up as an expense transaction
  too, so my totals stay accurate without double entry.
- As a user, I want to register a payment on an installment and have the
  debt's paid amount and status update automatically.
- As a user, I want to undo a payment if I marked it by mistake.
- As a user, I want marking an installment's transaction paid/pending
  from the transactions list to count as paying/unpaying that
  installment, so I don't have to do it twice.

## Acceptance criteria (EARS)

### Creation

- WHEN a user creates a debt with `totalAmount`, `totalInstallments`
  (1–420), `startDate`, THE SYSTEM SHALL split `totalAmount` evenly across
  `totalInstallments` (flat division, no interest applied even if
  `interestRate` is provided) and generate that many `DebtInstallment`
  rows: installment 1's due date = `startDate`, installment N's due date
  = `startDate + (N-1) months` (same calendar-month arithmetic as
  recurring transactions, `addMonthsToDateString`).
- THE SYSTEM SHALL split to the cent: every installment gets
  `floor(totalAmount / totalInstallments)` (to 2 decimals), and the last
  installment absorbs the remainder, so installments always sum to
  exactly `totalAmount`.
- IF `totalAmount < 0.01 × totalInstallments` (an installment would round
  to R$ 0,00), THEN THE SYSTEM SHALL reject the request with 400.
- WHEN each installment is generated, THE SYSTEM SHALL also create a
  linked expense `Transaction` in the debt's workspace — description
  `"Parcela {n}/{total} - {debtName}"`, category = the debt's category or
  the fallback expense category (see below), `amount` = the installment's
  amount, `date` = its due date, `status = PAID` if the due date is
  on/before today, else `PENDING` — and store the transaction's id on the
  installment (`transactionId`).
- THE SYSTEM SHALL create every installment with `status = PENDING`,
  regardless of its due date — even when its linked transaction was
  created `PAID` above. This is legacy-literal behavior, confirmed by the
  owner on 2026-09-23: registering an in-progress financing marks its past
  installments' *expenses* as paid, but the *debt* still expects each past
  installment to be registered as paid explicitly.
- WHEN a debt is created, THE SYSTEM SHALL compute its status immediately
  (see "Status derivation") — so a debt whose `startDate` is before today
  is created `OVERDUE`.
- IF `categoryId` is given, THEN it SHALL be one of the user's own
  `EXPENSE` categories (404 if not found/not owned, 400 if it's an
  `INCOME` category — the linked transactions are expenses).
- IF `categoryId` is omitted, THEN THE SYSTEM SHALL use the user's oldest
  `EXPENSE` category for the linked transactions (the debt's own
  `categoryId` stays null) — legacy `obterCategoriaDefaultDespesa()`.
  IF the user has no `EXPENSE` category at all, THEN THE SYSTEM SHALL
  reject the request with 400 (a `Transaction` can't exist without one).
- IF `endDate` is given and is before `startDate`, THEN THE SYSTEM SHALL
  reject with 400. `endDate` is informational only — it never drives
  installment generation.
- Installment creation, linked-transaction creation, and the debt row are
  written atomically (one database transaction).

### Editing

- IF a debt has `paidInstallments > 0`, THEN THE SYSTEM SHALL reject a
  request that changes `totalInstallments` with 400 ("Cannot change the
  number of installments once some are paid.") — and likewise a request
  that changes `startDate` (400, "Cannot change the start date once some
  installments are paid.").
- WHEN `totalInstallments` or `startDate` changes and none are paid yet,
  THE SYSTEM SHALL delete and regenerate all installments and their
  linked transactions, exactly as on creation (using the edited name,
  amount, dates, and category).
- WHEN `totalAmount` changes but no regeneration happens, THE SYSTEM
  SHALL recalculate only *pending* installments as `(totalAmount -
  alreadyPaid) / pendingCount` (same to-the-cent split, last pending
  installment absorbs the remainder), and update each of those
  installments' linked transaction `amount` to match. Paid installments
  and their transactions are untouched. IF the new `totalAmount` leaves
  less than R$ 0,01 per pending installment, THEN THE SYSTEM SHALL reject
  with 400. IF every installment is already paid, THEN changing
  `totalAmount` SHALL be rejected with 400 (no pending installment is
  left to absorb the difference).
- WHEN `name` or `categoryId` changes, THE SYSTEM SHALL propagate it to
  every linked transaction (description re-rendered as
  `"Parcela {n}/{total} - {name}"`; category replaced). Clearing
  `categoryId` (sending `null`) leaves linked transactions' categories
  as they are.
- `endDate`, `interestRate`, `categoryId`, and `notes` can be cleared by
  sending `null`.

### Paying / cancelling

- WHEN a user registers payment on an installment (`paymentDate`,
  `paidAmount > 0`), THE SYSTEM SHALL: update the linked transaction to
  `status=PAID, date=paymentDate` (or, if the linked transaction was
  deleted, create a new `PAID` one with `amount = paidAmount`,
  `date = paymentDate` and link it), set the installment
  `status=PAID, paymentDate=...`, then recompute the parent debt. The
  installment's own `amount` is never overwritten by `paidAmount` (matches
  legacy — there is no separate "amount actually paid" field on the
  installment).
- IF the installment is already `PAID`, THEN THE SYSTEM SHALL reject the
  payment with 400 (legacy: "Esta parcela já está paga.").
- WHEN a user cancels a payment, THE SYSTEM SHALL revert the linked
  transaction to `status=PENDING` (not delete it; its date is left as-is)
  and the installment to `status=PENDING, paymentDate=null`, then
  recompute the parent debt.
- IF the installment isn't `PAID`, THEN cancelling SHALL be rejected
  with 400.
- WHEN a linked transaction's status is changed through
  `PATCH /transactions/:id/status`, THE SYSTEM SHALL mirror it on the
  installment (`PAID` → installment `PAID`, `paymentDate = today`;
  `PENDING` → installment `PENDING`, `paymentDate = null`) and recompute
  the parent debt, atomically with the status change — legacy
  `atualizarStatusTransacao`.
- Pay/cancel/transaction-status changes are guarded against double
  submission and races server-side too (a row lock on the debt, then the
  installment status is re-checked), not only by disabling the button.

### Status derivation

- `DebtStatus` is `ACTIVE` | `PAID_OFF` | `OVERDUE` only (no `CANCELLED`
  — dropped, see `product.md`).
- Recompute = `paidAmount` = sum of paid installments' amounts,
  `paidInstallments` = count of paid installments, `status` =
  `PAID_OFF` if every installment is paid, else `OVERDUE` if any pending
  installment's due date is before today, else `ACTIVE`.
- WHEN debts are read (`GET /debts`, `GET /debts/:id`), THE SYSTEM SHALL
  first flip any of the user's `ACTIVE` debts that now have a pending
  installment past its due date to `OVERDUE`. Legacy had a function for
  this (`verificarStatusDividas`) that nothing ever called, so its stored
  status went stale until the next payment — finishing unwired
  infrastructure, same as the changelog-expiry decision in `product.md`.
  (Only `ACTIVE → OVERDUE` can happen by time passing alone; every other
  transition happens through a mutation, which already recomputes.)

### Deleting

- WHEN a user deletes a debt, THE SYSTEM SHALL delete its installments
  *and* their linked transactions, atomically (legacy `excluirDivida`).
- WHEN a linked transaction is deleted through the transactions
  endpoints, THE SYSTEM SHALL keep the installment and null its
  `transactionId` (legacy FK is `ON DELETE SET NULL`); paying it later
  creates a fresh linked transaction (see above).

## Deliberate deviations from legacy

| Legacy | Rebuild | Why |
|---|---|---|
| Installment = `valor_total / total_parcelas` rounded per row by MySQL, so installments can sum to a cent more/less than the total | To-the-cent split, last installment absorbs the remainder | A fully paid debt must show `paidAmount == totalAmount` |
| Transaction description `"Parcela {n}/{total} - {nome}"` (spec draft said English `"Installment ..."`) | `"Parcela {n}/{total} - {name}"` | It's user-visible stored text shown in the pt-BR app — the "codebase is English" rule covers identifiers/messages, not user content. Also matches imported legacy rows. |
| Editing `total_parcelas` regenerates installments but never recreates their transactions (orphans the old ones, new ones have none) | Regenerates both | Spec requirement — a debt never has installments without linked transactions |
| Editing `valor_total` updates pending installments but not their transactions | Updates both | Same |
| Editing name/category doesn't touch linked transactions | Propagates | Same — no double entry |
| Editing `data_inicio` alone never moves any due date | Regenerates (none paid) or 400 (some paid) | Otherwise installment 1's due date silently disagrees with the debt's start date |
| Status goes stale when an installment's due date passes | Refreshed on read | See "Status derivation" |
| Allows `total_parcelas = 0` (a debt with no installments) | 1–420 | Spec — installments are the point of the feature; 420 = 35-year mortgage, caps row explosion |

## Out of scope

- Real amortization/interest calculation (see `product.md` decision —
  `interestRate` is informational only).
- Debt-due-soon alerts on the dashboard (see `product.md` — not surfaced
  there, matches legacy).
- Porting legacy `dividas`/`dividas_parcelas` rows in
  `apps/api/scripts/import-legacy.ts` — follow-up, tracked separately.

## Open questions

- None blocking.
