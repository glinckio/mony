# Tasks — Categories

## API

- [ ] Prisma: `Category` model, `CategoryType` enum, migration
- [ ] `prisma/seed.ts`: system default categories (icon/color palette
      ported from legacy `categorias.php`)
- [ ] `CategoriesModule`, `CategoriesController`, `CategoriesService`
- [ ] DTOs with validation + `@ApiProperty` examples
- [ ] List: merge system (`userId=null`) + owned categories
- [ ] Delete: transaction-in-use check + bulk reassign + delete, wrapped
      in a Prisma `$transaction`
- [ ] Swagger decorators on all four endpoints
- [ ] Update `docs/postman/collection.json` with examples
- [ ] Unit tests: list merging, create, update ownership check, delete
      with/without replacement, delete blocked on system category
- [ ] E2E tests: create → use → delete-with-replacement flow

## Shared types

- [ ] `packages/shared-types/src/category.ts`

## Mobile

- [ ] `CategoriesScreen`
- [ ] `CategoryFormScreen` (create/edit modal)
- [ ] Delete-with-replacement dialog
- [ ] Unit tests: form validation, system-category actions hidden
- [ ] Maestro flow: `e2e/flows/categories.yaml` — create, edit, delete a
      category with no transactions (delete-with-replacement covered once
      `transactions` exists, see that feature's E2E flow)

## Review gates

- [ ] `code-reviewer`
- [ ] `api-contract-guardian`
- [ ] Lint + typecheck clean, all tests green
- [ ] `workflow-guardian` — commit message(s) drafted
