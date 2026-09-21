# Tasks — Categories

## API

- [x] Prisma: `Category` model (`userId` required, no system/null-owner
      categories — confirmed against legacy SQL dump), `CategoryType`
      enum, migration (hand-written to match `prisma migrate diff`
      output — no shadow DB in this session — then applied for real via
      `prisma migrate deploy` once Postgres was reachable)
- [x] `CategoriesModule`, `CategoriesController`, `CategoriesService`
- [x] DTOs with validation + `@ApiProperty` examples
- [x] List: user's own categories only, sorted by name
- [x] Delete: owner check + optional `replacementCategoryId` validation.
      Full transaction-in-use/reassign logic deferred to the
      `transactions` feature (no `Transaction` table exists yet to check
      against — see design.md and the comment in categories.service.ts)
- [x] Swagger decorators on all four endpoints
- [x] Update `docs/postman/collection.json` with examples
- [x] Unit tests: list, create, update ownership check, delete
      with/without replacement
- [x] E2E tests: create → list/filter → update → 404 on non-owner →
      delete (ran against a real Postgres instance, all green)

## Shared types

- [x] `packages/shared-types/src/category.ts` — schemas + fixed
      `CATEGORY_ICONS` list (freshly authored — legacy has no default
      category list to port, only an icon picker; see requirements.md)

## Mobile

- [x] `CategoriesScreen`
- [x] `CategoryFormScreen` (create/edit modal)
- [x] Delete-with-replacement dialog (inline banner, wired to the 400
      response — currently unreachable until `transactions` lands, same
      as the API side)
- [x] Unit tests: form validation
- [x] Maestro flow: `e2e/flows/categories.yaml` — create, edit, delete a
      category with no transactions (delete-with-replacement covered once
      `transactions` exists, see that feature's E2E flow)

## Review gates

- [x] `code-reviewer` — fixed: `icon` typed as `z.enum(CATEGORY_ICONS)` instead
      of `z.string()` (removed unsafe `as never` casts in
      CategoriesScreen.tsx), color palette centralized as
      `CATEGORY_COLORS` in shared-types (was duplicated in
      categories.service.ts and ColorSwatchPicker.tsx), delete() now
      rejects a self-referencing or cross-type `replacementCategoryId`
- [x] `api-contract-guardian` — fixed: `@ApiBadRequestResponse` added to
      `GET /categories`, plus the three missing 400 Postman examples
      (list/update/delete). Confirmed the `CATEGORY_ICONS` error message
      is byte-for-byte accurate. Also surfaced a pre-existing,
      out-of-scope bug: `pnpm --filter @mony/api dev` fails to boot on
      Node 22 (`ERR_MODULE_NOT_FOUND` on shared-types' extensionless
      `./auth` re-export — a `require(esm)` interop issue, not caused by
      this feature) — flagged for separate follow-up, not fixed here
- [x] Lint + typecheck clean, all tests green (API + mobile + shared-types)
- [x] `workflow-guardian` — lint/typecheck/tests reconfirmed clean repo-wide; DB migration verified applied+e2e-tested against real Postgres in-session; Node 22 dev-server ERR_MODULE_NOT_FOUND corroborated as pre-existing/out-of-scope (tracked as task_bd40579b); commit messages drafted (shared-types → api → mobile → docs, matching user-profile precedent); roadmap.md flipped to Done
