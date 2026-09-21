# Tasks — Goals

## API

- [x] Prisma: `Goal` model, migration (generated via a real shadow DB,
      applied with `prisma migrate dev`), plus `@@index([categoryId])`
      up front (learned from the categories/transactions follow-up)
- [x] `GoalsModule`, `GoalsController`, `GoalsService`
- [x] DTOs with validation + `@ApiProperty` examples
- [x] `progressPercent` computed in the service, clamped 0–100 (Decimal
      division, avoids divide-by-zero when targetAmount is 0)
- [x] Workspace-scoped list/create (fresh DB read per request, matching
      the transactions/categories precedent)
- [x] Swagger decorators on all four endpoints
- [x] Update `docs/postman/collection.json` with examples
- [x] Unit tests: create, update currentAmount, progressPercent clamping,
      completed flag independence from currentAmount, delete
- [x] E2E tests: create → update progress → mark complete → delete,
      verified against a real Postgres instance
- [x] Post-review product change: marking `completed = true` now forces
      `currentAmount` to `targetAmount` (was fully independent, matching
      legacy) — explicit user decision after launch, deviates from
      legacy parity. Updated service, unit tests, e2e test, Postman
      example, `requirements.md`/`design.md`.

## Shared types

- [x] `packages/shared-types/src/goal.ts`
- [x] Extracted `packages/shared-types/src/money.ts`
      (`positiveAmountSchema`/`nonNegativeAmountSchema`) — was
      duplicated inline in `transaction.ts`; `transaction.ts` refactored
      to use it too. Fixed a bug while extracting: the "Valor é
      obrigatório" message only covered wrong-type input, not a missing
      field (zod's default `required_error` differs from
      `invalid_type_error`) — now sets both.

## Mobile

- [x] `GoalsScreen` (progress bars via new `ProgressBar` ui component,
      overdue badge — "atrasada" if `targetDate` past and `!completed`,
      verified against legacy `metas.php`)
- [x] `GoalFormScreen` (direct `currentAmount` input, `completed`
      checkbox shown only when editing — matches legacy, never sent on
      creation; optional category picker with a "Nenhuma" option —
      initially missed in the first pass, caught by `code-reviewer`
      against `design.md`'s "Reads: `GET /categories`" line, added
      after)
- [x] Unit tests: form validation, overdue-badge logic (including the
      overdue-but-completed case, which must NOT show the badge),
      category selection
- [x] Maestro flow: `e2e/flows/goals.yaml` — create a goal, update
      progress, mark complete

## Review gates

- [x] `code-reviewer` — fixed: `GoalFormScreen` was missing the category
      picker entirely (`categoryId` was dead in the UI, contradicting
      `design.md`) — added, matching `TransactionFormScreen`'s chip
      pattern plus a "Nenhuma" option since it's optional here. Confirmed
      correct as-is: progressPercent divide-by-zero guard (unreachable
      given DTO validation, kept defensively), `completed` independence,
      the `?completed=` boolean `@Transform` fix, the overdue-badge
      string-date comparison, and the intentional lack of a category
      `type` constraint (unlike transactions).
- [x] `api-contract-guardian` — PASS, no changes needed. Verified
      progressPercent math against every Postman example, the
      `?completed=` transform, Swagger decorators, and DTO examples all
      match transactions/categories conventions.
- [x] `lgpd-security-reviewer` — clean, no blockers. Ownership scoping
      (404-not-403 on not-owned, matches convention), no logging of
      financial fields, mobile never surfaces raw API errors. Confirmed
      the account-level export/delete gap is pre-existing and already
      tracked under "Release hardening" in `docs/steering/roadmap.md`,
      not specific to this feature.
- [x] Lint + typecheck clean, all tests green (API 75 unit / 57 e2e,
      mobile 46, shared-types 50)
- [x] `workflow-guardian` — lint/typecheck/tests clean across api, mobile, shared-types; commit messages drafted below
