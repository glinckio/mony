# Requirements — Goals

## Summary

Savings/financial goals with a manually-set current amount — matches
legacy exactly: there is no automatic linkage between transactions and
goal progress, the user directly edits `currentAmount`.

## User stories

- As a user, I want to create a goal with a target amount and optional
  deadline.
- As a user, I want to update my progress toward a goal manually.
- As a user, I want to mark a goal as completed.

## Acceptance criteria (EARS)

- WHEN a user creates a goal, THE SYSTEM SHALL require `title` (1–100
  chars) and `targetAmount` (> 0); `currentAmount` defaults to 0,
  `targetDate` and `categoryId` are optional, scoped to `activeWorkspace`.
- WHEN a user updates `currentAmount`, THE SYSTEM SHALL accept any
  non-negative value — no automatic linkage to transactions (matches
  legacy; there is no "add contribution" transaction flow).
- THE SYSTEM SHALL compute `progressPercent = min(100, max(0,
  currentAmount / targetAmount * 100))` for display; this is a derived
  value, not stored.
- `completed` is a manual boolean flag the user sets — it is NOT
  auto-derived from `currentAmount >= targetAmount` (matches legacy).
- WHEN a user deletes a goal, THE SYSTEM SHALL delete it directly — no
  dependency checks (nothing else references a Goal).

## Out of scope

- Automatic goal funding from transactions (not in legacy — would be a
  deliberate new feature, not requested here).

## Open questions

- None blocking.
