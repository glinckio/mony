# Tasks — Debts

## API

- [ ] Prisma: `Debt`, `DebtInstallment` models, `DebtStatus`/`InstallmentStatus`
      enums, migration (wires the `Transaction.debtInstallment` reverse relation)
- [ ] `DebtsModule`, `DebtsController`, `DebtsService` (depends on
      `TransactionsService` — documented exception to the no-cross-import rule)
- [ ] DTOs with validation + `@ApiProperty` examples
- [ ] Create: even split across installments, due-date generation
      (`startDate + (n-1) months`), linked-transaction creation with
      correct status-by-due-date, all in one `$transaction`
- [ ] Update: block installment-count change if `paidInstallments > 0`;
      regenerate-if-count-changes-and-none-paid; recompute
      pending-only amounts if `totalAmount` changes
- [ ] Pay installment: update linked transaction, update installment,
      recompute parent debt (`paidAmount`, `paidInstallments`, `status`)
- [ ] Cancel payment: revert transaction to PENDING, revert installment,
      recompute parent debt
- [ ] Swagger decorators on all seven endpoints
- [ ] Update `docs/postman/collection.json` with examples (including a
      full create → pay → cancel-payment sequence)
- [ ] Unit tests: even split + due-date math, linked-transaction status
      rule, installment-count-change block, pending-only recalculation,
      pay/cancel-payment bidirectional sync, debt status derivation
      (ACTIVE/PAID_OFF/OVERDUE)
- [ ] E2E tests: create a debt → verify installments + linked
      transactions exist and appear in `GET /transactions` → pay one →
      verify debt/transaction sync → cancel payment → verify revert

## Shared types

- [ ] `packages/shared-types/src/debt.ts`

## Mobile

- [ ] `DebtsListScreen`
- [ ] `DebtDetailScreen` (installment list, pay/cancel actions)
- [ ] `DebtFormScreen`
- [ ] Pay-installment sheet
- [ ] Unit tests: form validation, installment-count field disabled state
- [ ] Maestro flow: `e2e/flows/debts.yaml` — create a debt, verify
      installments listed, pay one, verify it reflects in
      `TransactionsListScreen`, cancel the payment

## Review gates

- [ ] `code-reviewer` — atomicity of installment+transaction creation
- [ ] `api-contract-guardian`
- [ ] `lgpd-security-reviewer` — debt is financial personal data
- [ ] `performance-auditor` — N+1 on installment/transaction joins
- [ ] Lint + typecheck clean, all tests green
- [ ] `workflow-guardian` — commit message(s) drafted
