# Requirements — Grocery

## Summary

A household stock list (ideal quantity vs. current quantity per item) plus
an informational monthly budget log. Matches legacy (`mercado.php`): the
budget is never enforced as a hard cap, just displayed. Not
workspace-scoped (matches legacy — grocery is user-level, not split by
personal/business).

## User stories

- As a user, I want to maintain a list of grocery items with an ideal and
  current quantity, so I know what's missing.
- As a user, I want to bump an item's current quantity up/down straight
  from the list, without opening the edit form.
- As a user, I want to set a monthly budget and see how the estimated
  cost of missing items compares to it.
- As a user, I want to share the list of what's missing (e.g. on
  WhatsApp) so whoever goes to the store knows what to buy.

## Acceptance criteria (EARS)

- WHEN a user creates a grocery item, THE SYSTEM SHALL require `name`
  (1–100 chars), `unit` (1–30 chars — legacy column is `varchar(30)`),
  `idealQuantity` (>= 0), `estimatedPrice` (>= 0, per unit), `category`
  (one of a fixed 12-value enum — not FK'd to `Category`, matches legacy),
  and accept `currentQuantity` (>= 0, default 0). Quantities and price
  allow up to 2 decimals (e.g. 1.5 kg).
- THE SYSTEM SHALL list a user's items ordered by category, then name
  (legacy `ORDER BY categoria, nome`).
- THE SYSTEM SHALL compute `missing = currentQuantity < idealQuantity`
  and `estimatedPurchaseTotal` = sum over missing items of
  `(idealQuantity - currentQuantity) * estimatedPrice` — both derived,
  never stored — over ALL of the user's items. (Legacy computed it over
  whatever category filter was active, so the budget card's number
  changed with the filter — the rebuild's summary is filter-independent.)
- WHEN a user sets a new budget amount (>= 0), THE SYSTEM SHALL INSERT a
  new `GroceryBudget` row (never UPDATE) — matches legacy's audit-trail
  behavior; "current budget" = the most recent row. There is no monthly
  reset: "monthly" is just the label, as in legacy.
- THE SYSTEM SHALL NOT block adding/editing items when
  `estimatedPurchaseTotal` exceeds the current budget — informational
  only, matches legacy exactly.
- The budget card shows `usedPercent = min(100, estimatedPurchaseTotal /
  budget * 100)` (0 when there's no budget or it's 0), colored success
  up to 70%, warning up to 90%, danger above (legacy thresholds), and the
  remaining balance `max(0, budget - estimatedPurchaseTotal)`, in danger
  color when the estimate exceeds the budget.
- WHEN the user taps + / − on an item row, THE SYSTEM SHALL change its
  `currentQuantity` by 1 (never below 0), updating the row immediately
  (optimistic) and saving in the background — legacy's quick
  `atualizar_quantidade` action. **Deliberate change from legacy:**
  legacy's buttons stepped an input by 0.01 and then needed a submit;
  a step of 1 is what a stock count actually moves by (fractional
  amounts are still editable in the item form). IF saving fails, THEN
  THE SYSTEM SHALL show a pt-BR toast and reload the list from the
  server (so the row returns to its saved value).
- WHEN the user shares the list, THE SYSTEM SHALL open the device's
  native share sheet with the missing items grouped by category, each
  line `- {name}: {idealQuantity - currentQuantity} {unit}`, followed by
  the estimated total — legacy's WhatsApp message format. Client-side
  only; no endpoint. (Owner decision 2026-09-25: include it now, via the
  native share sheet instead of legacy's `wa.me` link + typed phone
  number.)
- Item routes are user-scoped: another user's item id is a 404.

## Out of scope

- CSV export and print view (legacy had both, client-side only).
- Enforcing the budget or resetting it monthly.

## Open questions

- None blocking.
