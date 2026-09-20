# Requirements — Grocery

## Summary

A household stock list (ideal quantity vs. current quantity per item) plus
an informational monthly budget log. Matches legacy: the budget is never
enforced as a hard cap, just displayed. Not workspace-scoped (matches
legacy — grocery is user-level, not split by personal/business).

## User stories

- As a user, I want to maintain a list of grocery items with an ideal and
  current quantity, so I know what's missing.
- As a user, I want to set a monthly budget and see how the estimated
  cost of missing items compares to it.

## Acceptance criteria (EARS)

- WHEN a user creates a grocery item, THE SYSTEM SHALL require `name`,
  `unit`, `idealQuantity` (>= 0), `currentQuantity` (>= 0, default 0),
  `estimatedPrice` (>= 0), `category` (one of a fixed 12-value enum, free
  text — not FK'd to `Category`, matches legacy exactly).
- THE SYSTEM SHALL compute `missing = currentQuantity < idealQuantity` and
  `estimatedPurchaseTotal` = sum over missing items of `(idealQuantity -
  currentQuantity) * estimatedPrice` — both derived, not stored.
- WHEN a user sets a new budget amount, THE SYSTEM SHALL INSERT a new
  `GroceryBudget` row (never UPDATE) — matches legacy's audit-trail
  behavior; "current budget" = the most recent row.
- THE SYSTEM SHALL NOT block adding/editing items when
  `estimatedPurchaseTotal` exceeds the current budget — informational
  only, matches legacy exactly.

## Out of scope

- Shopping-list sharing/export (WhatsApp share, CSV export, print) — pure
  client-side formatting in legacy, revisit as a mobile-native share sheet
  if requested later, not part of this API-first spec.

## Open questions

- None blocking.
