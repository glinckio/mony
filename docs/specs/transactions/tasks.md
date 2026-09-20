# Tasks — Transactions

## API

- [ ] Prisma: `Transaction` model, `TransactionType`/`TransactionStatus`
      enums, migration (adds reverse relation stub for `debts` later)
- [ ] `TransactionsModule`, `TransactionsController`, `TransactionsService`
- [ ] DTOs with validation + `@ApiProperty` examples (note `amount` as
      Decimal-safe validation, not a plain float)
- [ ] Create: category ownership+type-match check, force `status=PAID`
      for income, recurring batch-generation logic (1–60 months, suffix
      description, per-row status rule)
- [ ] List: pagination, filters, sort allow-list, workspace-scoped
- [ ] Update, status-change (with non-expense 400), delete, bulk-delete
      (Prisma `$transaction`)
- [ ] Summary endpoint (income/expensesPaid/expensesPending/balance)
- [ ] Swagger decorators on all seven endpoints
- [ ] Update `docs/postman/collection.json` with examples for all seven
      (including a recurring-creation example showing the array response)
- [ ] Unit tests: income forces PAID, recurring generates N rows with
      correct suffixes/statuses, status-change rejected on income,
      summary math matches spec exactly, sort allow-list rejects unknown
      fields
- [ ] E2E tests: create → list/filter → update status → delete;
      recurring creation → list shows all generated rows

## Shared types

- [ ] `packages/shared-types/src/transaction.ts` + `formatCurrency` helper

## Mobile

- [ ] `TransactionsListScreen` (filters, infinite scroll via TanStack Query)
- [ ] `TransactionFormScreen` (type toggle, recurring toggle, category picker)
- [ ] Status toggle component (expense rows only)
- [ ] Unit tests: form validation, recurring months bounds, status toggle
      hidden on income
- [ ] Maestro flow: `e2e/flows/transactions.yaml` — create an expense,
      mark paid, create a recurring income, verify multiple rows appear,
      delete one, bulk-delete two

## Review gates

- [ ] `code-reviewer` — Decimal handling, N+1 on category joins
- [ ] `api-contract-guardian`
- [ ] `performance-auditor` — list query indexes, pagination cost
- [ ] Lint + typecheck clean, all tests green
- [ ] `workflow-guardian` — commit message(s) drafted
