# Tasks — Transactions

## API

- [x] Prisma: `Transaction` model, `TransactionType`/`TransactionStatus`
      enums, migration (adds `transactions Transaction[]` to `Category`;
      generated via a real shadow DB this time — Postgres was reachable
      in-session — and applied with `prisma migrate dev`)
- [x] `TransactionsModule`, `TransactionsController`, `TransactionsService`
- [x] DTOs with validation + `@ApiProperty` examples (note `amount` as
      Decimal-safe validation, not a plain float)
- [x] Create: category ownership+type-match check, force `status=PAID`
      for income, recurring batch-generation logic (1–60 months, suffix
      description, per-row status rule) — verified against legacy
      `processar_transacao.php`/`funcoes_transacoes.php` line by line
- [x] List: pagination, filters, sort allow-list, workspace-scoped
      (workspace read fresh from the DB per request, not the JWT claim,
      since staleness here would show the wrong workspace's data, not
      just a cosmetic label)
- [x] Update, status-change (with non-expense 400), delete, bulk-delete
- [x] Summary endpoint (income/expensesPaid/expensesPending/balance) —
      formula verified against legacy `obterResumoFinanceiro()`
- [x] Swagger decorators on all seven endpoints
- [x] Update `docs/postman/collection.json` with examples for all seven
      (including a recurring-creation example showing the array response)
- [x] Unit tests: income forces PAID, recurring generates N rows with
      correct suffixes/statuses, status-change rejected on income,
      summary math matches spec exactly, sort allow-list rejects unknown
      fields
- [x] E2E tests: create → list/filter → update status → delete;
      recurring creation → list shows all generated rows; also covers
      the now-real category-in-use delete block (implemented as part of
      this feature — see Categories follow-up below)
- [x] **Follow-up on `categories`**: implemented the transaction-in-use
      check in `categories.service.ts#delete` that was deferred there
      (no `Transaction` table existed yet at the time) — blocks delete
      with 400 if the category has transactions and no
      `replacementCategoryId` is given, reassigns + deletes atomically
      when one is given

## Shared types

- [x] `packages/shared-types/src/transaction.ts` + `formatCurrency` helper

## Mobile

- [x] `TransactionsListScreen` (type/search filters, infinite scroll via
      TanStack Query `useInfiniteQuery`; category and date-range filters
      are supported server-side but not yet exposed in this screen's UI
      — noted as a follow-up, not silently dropped)
- [x] `TransactionFormScreen` (type toggle, recurring toggle, category
      picker fetched per selected type)
- [x] Status toggle component (expense rows only, inline on list rows)
- [x] Long-press multi-select + bulk-delete on the list (wasn't in the
      original task bullets explicitly, but the Maestro flow below
      requires it and the API already had the endpoint)
- [x] Unit tests: form validation, recurring months bounds, status toggle
      hidden on income
- [x] Maestro flow: `e2e/flows/transactions.yaml` — create an expense,
      mark paid, create a recurring income, verify multiple rows appear,
      delete one, bulk-delete two
- [x] Wired `QueryClientProvider` into `App.tsx` (first feature to use
      TanStack Query — it was an installed-but-unused dependency before
      this)

## Review gates

- [x] `code-reviewer` — fixed: HIGH float-precision bug in the shared
      zod `amount` refine (`value * 100` comparison rejected valid
      to-the-cent amounts like 1.15/19.99 essentially at random; now a
      string-based regex check, matching the API DTOs' approach), plus
      2 MEDIUM mobile UX fixes in `TransactionsListScreen.tsx`: search
      input now debounced (300ms) instead of refetching per keystroke,
      pull-to-refresh spinner now driven by `isRefetching` instead of
      `isLoading` (was never showing on manual refresh). No N+1 found —
      `TransactionDto` never embeds/joins `Category`, matches design.md.
- [x] `api-contract-guardian` — clean, no fixes needed (verified live
      against `/docs-json`: Swagger decorators, oneOf response schema on
      POST /transactions, `page`/`perPage` `@Type(() => Number)` fix in
      place, recurring-array Postman example traced exactly against
      transactions.service.ts, Categories folder's new in-use-check
      example matches the real error message)
- [x] `performance-auditor` — indexes/pagination/getActiveWorkspace/
      recurring-batch-create all reasoned tradeoffs at current scale;
      one real gap fixed: added `@@index([categoryId])` to `Transaction`
      (was an unindexed FK, hit by categories.service.ts#delete's
      in-use check and its replacement `updateMany` reassignment) via
      migration `20260921202853_add_transaction_category_index`
- [x] Lint + typecheck clean, all tests green (API + mobile +
      shared-types). Mobile `test` script now runs with `--forceExit` —
      TanStack Query registers global listeners outside any single
      `QueryClient` instance, which otherwise hangs Jest after all tests
      pass; documented in `docs/steering/tech.md`
- [ ] `workflow-guardian` — commit message(s) drafted
