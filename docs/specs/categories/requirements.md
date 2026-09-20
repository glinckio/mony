# Requirements — Categories

## Summary

Income/expense categories: system defaults (visible to everyone, not
editable) plus user-created custom categories. Deleting a category in use
requires picking a replacement category of the same type.

## User stories

- As a user, I want to see system default categories plus my own, so I
  can categorize transactions.
- As a user, I want to create, edit, and delete my own categories.
- As a user, I want deleting a category that's in use to reassign its
  transactions instead of losing that data.

## Acceptance criteria (EARS)

- WHEN a user lists categories, THE SYSTEM SHALL return system categories
  (`userId = null`) plus that user's own categories, sorted by name.
- WHEN a user creates a category, THE SYSTEM SHALL require `name` (1–50
  chars) and `type` (`INCOME` | `EXPENSE`); `color` defaults to a random
  hex if omitted; `icon` is one of a fixed enum of supported icon keys.
- IF a user attempts to edit or delete a category they don't own
  (including system categories), THEN THE SYSTEM SHALL return 403/404 (not
  reveal existence to a non-owner).
- WHEN a user deletes a category that has associated transactions, THE
  SYSTEM SHALL require a `replacementCategoryId` (same `type`) in the
  request, bulk-reassign those transactions, then delete the category —
  in one transaction (all-or-nothing).
- IF `replacementCategoryId` is omitted but the category has transactions,
  THEN THE SYSTEM SHALL return 400 asking for a replacement.

## Out of scope

- Category-level budgets (not in legacy for categories — that's the
  separate `grocery` feature's budget concept).

## Open questions

- None blocking.
