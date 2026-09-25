# Tasks — Grocery

## API

- [x] Prisma: `GroceryItem`, `GroceryBudget` models, `GroceryCategory`
      enum, migration `add_grocery` (enum declared in pt-BR-label
      alphabetical order so `ORDER BY category` matches legacy)
- [x] `GroceryModule`, `GroceryController`, `GroceryService`
- [x] DTOs with validation + `@ApiProperty` examples (trimmed strings,
      Decimal(10,2)/(12,2) caps, explicit `null` rejected on PATCH)
- [x] Items: list (ordered category, name; `missing` per row), create,
      update, delete — user-scoped, 404 for other users' ids
- [x] Budget: always INSERT, "current" = latest by `createdAt`
- [x] Summary: total/missing counts + estimated total (exact decimals,
      all items regardless of any client filter)
- [x] Swagger decorators on all seven endpoints
- [x] Update `docs/postman/collection.json` with examples (captured from
      the live API)
- [x] Unit tests: item CRUD, budget insert-only behavior, summary math
      (missing items only, correct total)
- [x] E2E tests (14): create items, set budget twice (verify "current" is
      the latest), summary reflects missing items, ownership 404s,
      validation/boundaries, never blocked when over budget

## Shared types

- [x] `packages/shared-types/src/grocery.ts` (+ tests); `MAX_MONEY_AMOUNT`
      moved to `money.ts` as the single money cap (API re-exports it)

## Mobile

- [x] `Mais` → `Mercado` row; `Grocery` stack route
- [x] `ProgressBar` `tone` prop; new ui `IconButton`
- [x] `GroceryScreen` (budget card, missing filter, grouped `SectionList`,
      optimistic ± stepper serialized via mutation `scope`, share)
- [x] Budget sheet
- [x] `GroceryItemFormScreen` (with delete when editing)
- [x] `lib/grocery-display.ts`: category labels, budget tone thresholds,
      `buildShoppingListMessage`; `lib/decimal-input.ts` shared with
      `DebtFormScreen` (also fixes a typed "." being dropped from the
      debt interest rate — "1.99" used to become 199%)
- [x] Unit tests: form validation, budget progress bar color logic,
      share message format, stepper (incl. fast taps + failure), budget
      sheet, create/edit/submit-error
- [x] Maestro flow: `e2e/flows/grocery.yaml` — add items, set a budget,
      verify summary numbers, stepper + missing filter (written; not run
      in this environment — needs a device/simulator)

## Review gates

- [x] `code-reviewer` — no High. Medium: fast ± taps could lose an
      increment (fixed with optimistic updates + serialized mutation
      scope); hand-built stepper buttons (now `components/ui/IconButton`).
      Lows fixed: R$ 0 budget never shown as exceeded, non-null
      assertions on query data, share button error handling / enabled
      before data settled, Maestro tapping the "Faltando" badge instead of
      the filter, spec drift. Follow-up spun off: shared `ChipPicker` for
      the 4 duplicated chip pickers.
- [x] `qa-engineer` — added tests across API e2e/unit, shared-types,
      mobile (see above); found the R$ 0 budget gap (fixed)
- [x] `api-contract-guardian` — PASS; added `estimatedPrice` description
      on the PATCH DTO and a "null for a non-nullable field" Postman example
- [x] `performance-auditor` — no N+1, indexes cover list and latest
      budget. Fixed: stepper awaited the summary refetch (2 round trips
      per tap), form invalidated the budget needlessly, per-render list
      callbacks. Left: summary could be derived client-side (design
      choice, kept server-side per spec); 2 queries per update/delete
      (repo-wide pattern)
- [x] Lint + typecheck clean, all tests green (API 156 unit / 108 e2e,
      mobile 94, shared-types 78)
- [x] `workflow-guardian` — commit message(s) drafted

(`lgpd-security-reviewer` not required: `GroceryItem`/`GroceryBudget`
aren't in `product.md`'s sensitive-data list — a household shopping list,
no payment/identity data. Ownership scoping is still covered by
`code-reviewer` + e2e.)
