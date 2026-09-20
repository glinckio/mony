# Tasks — Goals

## API

- [ ] Prisma: `Goal` model, migration
- [ ] `GoalsModule`, `GoalsController`, `GoalsService`
- [ ] DTOs with validation + `@ApiProperty` examples
- [ ] `progressPercent` computed in the service, clamped 0–100
- [ ] Workspace-scoped list/create
- [ ] Swagger decorators on all four endpoints
- [ ] Update `docs/postman/collection.json` with examples
- [ ] Unit tests: create, update currentAmount, progressPercent clamping,
      completed flag independence from currentAmount, delete
- [ ] E2E tests: create → update progress → mark complete → delete

## Shared types

- [ ] `packages/shared-types/src/goal.ts`

## Mobile

- [ ] `GoalsScreen` (progress bars, overdue badge)
- [ ] `GoalFormScreen`
- [ ] Unit tests: form validation, overdue-badge logic
- [ ] Maestro flow: `e2e/flows/goals.yaml` — create a goal, update
      progress, mark complete

## Review gates

- [ ] `code-reviewer`
- [ ] `api-contract-guardian`
- [ ] Lint + typecheck clean, all tests green
- [ ] `workflow-guardian` — commit message(s) drafted
