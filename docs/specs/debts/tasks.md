# Tasks — Debts

## API

- [x] Prisma: `Debt`, `DebtInstallment` models, `DebtStatus`/`InstallmentStatus`
      enums, migration `20260923184606_add_debt` (wires the
      `Transaction.debtInstallment` reverse relation); follow-up
      `20260924230153_add_debt_installment_due_date_index` widens
      `[debtId, status]` to `[debtId, status, dueDate]` (performance-auditor —
      covers the stale-OVERDUE refresh's `dueDate < today` filter)
- [x] `src/common/debt-sync/debt-sync.ts`: `splitAmount`, `computeDebtTotals`,
      `lockDebt` (`SELECT ... FOR UPDATE`), `lockLinkedDebt`, `recomputeDebt`,
      `syncInstallmentFromTransactionStatus`, `renameLinkedTransactions`
- [x] `DebtsModule`, `DebtsController`, `DebtsService` (writes linked
      transactions through its own `$transaction` client — no
      `TransactionsService` import, see design.md)
- [x] DTOs with validation + `@ApiProperty` examples (amounts capped at
      `MAX_MONEY_AMOUNT` so a `Decimal(12,2)` overflow is a 400, not a 500;
      explicit `null` rejected on non-nullable PATCH fields)
- [x] Create: to-the-cent split, due-date generation
      (`startDate + (n-1) months`), linked-transaction creation with
      status-by-due-date (installments always PENDING), fallback expense
      category, status computed at creation, all in one `$transaction`
      (ids pre-generated so it's 2 `createMany`, not 2 queries per installment)
- [x] Update: block installment-count/start-date change if any installment
      is paid; regenerate if either changes and none paid; recompute
      pending-only amounts (+ their transactions) if `totalAmount` changes;
      propagate name/category to linked transactions. Debt is locked and
      re-read inside the transaction before any "what changed" decision.
- [x] Pay installment: update (or recreate) linked transaction, update
      installment, recompute parent debt — under the debt row lock
- [x] Cancel payment: revert transaction to PENDING, revert installment,
      recompute parent debt — under the debt row lock
- [x] Delete: debt + installments + linked transactions atomically
- [x] Stale-status refresh (ACTIVE → OVERDUE) on list/detail reads
- [x] `TransactionsService#updateStatus`: mirror status onto a linked
      installment + recompute its debt, atomically; debt locked BEFORE the
      transaction row (same order as `DebtsService`, no deadlock); unlinked
      transactions skip the interactive transaction entirely
- [x] `CategoriesService#delete` with replacement also reassigns debts
- [x] Swagger decorators on all seven endpoints (+ side-effect notes on
      transactions status/delete/bulk-delete and categories delete)
- [x] Update `docs/postman/collection.json` with examples (create → pay →
      update → cancel-payment → delete sequence captured from the live API,
      plus a 400/404 example per declared status)
- [x] Unit tests: cent split + due-date math, linked-transaction status
      rule, installment-count/start-date change block, pending-only
      recalculation, pay/cancel-payment bidirectional sync, debt status
      derivation (ACTIVE/PAID_OFF/OVERDUE), transaction-status → installment
      sync + lock order, vanished-linked-transaction fallback
- [x] E2E tests (32): full lifecycle, legacy-literal past-due creation,
      stale-status refresh (list + detail), 420-installment boundary,
      null handling, second-user ownership (all routes 404), concurrent
      pays (same + different installments), category reassignment, isolation

## Shared types

- [x] `packages/shared-types/src/debt.ts` (+ tests), `date.ts`
      (`isCalendarDate` — debt date fields reject impossible dates)

## Mobile

- [x] Navigation: `Categorias` tab → `Mais` tab (`MoreScreen`);
      `Categories`/`Debts`/`DebtDetail` pushed on `AppStack`;
      `AppHeader` `onBack`; new ui `ListRow`, `Badge`, `BottomSheet`;
      `TextField` disabled look
- [x] `DebtsListScreen`
- [x] `DebtDetailScreen` (installment `FlatList` with memoized rows,
      pay/cancel actions)
- [x] `DebtFormScreen`
- [x] Pay-installment sheet
- [x] `TransactionsListScreen` status toggle + delete also invalidate debt
      and dashboard queries
- [x] Unit tests: form validation, installment-count field disabled state,
      list grouping, detail actions/pay-sheet defaults
- [x] Maestro flow: `e2e/flows/debts.yaml` — create a debt, verify
      installments listed, pay one, verify it reflects in
      `TransactionsListScreen`, cancel the payment (written; not run in
      this environment — needs a device/simulator)
- [x] Update existing Maestro flows that tapped `tab-categories`

## Review gates

- [x] `code-reviewer` — no Critical/High. Fixed all 3 Medium: debt-vs-
      transaction lock order could deadlock `updateStatus` against a
      concurrent pay; `null` on non-nullable PATCH fields (500s, and
      `startDate: null` silently regenerated every installment); `update()`
      decided from a pre-lock read. Also fixed Lows: impossible calendar
      dates reached the API, `NOW()` without UTC in the rename SQL,
      concurrent linked-transaction delete → 500, "Vencida" badge used
      local date while status uses UTC, full installment list passed as
      route params. Left for manual check: `BottomSheet` keyboard behavior
      on Android (verify via ADB).
- [x] `api-contract-guardian` — PASS after fixes: amount cap
      (`MAX_MONEY_AMOUNT`), nullable fields typed `"object"` in OpenAPI,
      incomplete 400 descriptions, missing Postman error examples.
- [x] `lgpd-security-reviewer` — no blockers. Raw SQL parameterized,
      ownership 404 everywhere, no personal data in logs/errors/examples.
      Pre-existing cross-feature issue spun off separately: React Query
      cache not cleared on logout.
- [x] `performance-auditor` — fixed: unlinked status toggles skip the
      interactive transaction; memoized installment rows; detail cache
      seeded from PATCH response; `[debtId, status, dueDate]` index.
      Noted, not done: installments read twice after each write (could be
      one query), no response compression app-wide, app-wide double refetch
      (invalidate + refetch-on-focus).
- [x] `qa-engineer` — added 13 e2e (see above); no unimplemented
      requirement found
- [x] Lint + typecheck clean, all tests green (API 144 unit / 94 e2e,
      mobile 64, shared-types 66)
- [x] `workflow-guardian` — gate passed; commit messages drafted for the human
