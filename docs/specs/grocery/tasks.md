# Tasks — Grocery

## API

- [ ] Prisma: `GroceryItem`, `GroceryBudget` models, `GroceryCategory`
      enum, migration
- [ ] `GroceryModule`, `GroceryController`, `GroceryService`
- [ ] DTOs with validation + `@ApiProperty` examples
- [ ] Budget: always INSERT, "current" = latest by `createdAt`
- [ ] Summary: missing-item + estimated-total computation
- [ ] Swagger decorators on all seven endpoints
- [ ] Update `docs/postman/collection.json` with examples
- [ ] Unit tests: item CRUD, budget insert-only behavior, summary math
      (missing items only, correct total)
- [ ] E2E tests: create items, set budget twice (verify "current" is the
      latest), verify summary reflects missing items

## Shared types

- [ ] `packages/shared-types/src/grocery.ts`

## Mobile

- [ ] `GroceryScreen`
- [ ] `GroceryItemFormScreen`
- [ ] Unit tests: form validation, budget progress bar color logic
- [ ] Maestro flow: `e2e/flows/grocery.yaml` — add items, set a budget,
      verify summary numbers

## Review gates

- [ ] `code-reviewer`
- [ ] `api-contract-guardian`
- [ ] Lint + typecheck clean, all tests green
- [ ] `workflow-guardian` — commit message(s) drafted
