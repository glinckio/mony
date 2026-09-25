# Design — Grocery

## Data model (Prisma)

```prisma
enum GroceryCategory {
  FOOD
  BEVERAGES
  MEAT
  FROZEN
  DAIRY_AND_DELI
  PERSONAL_CARE
  PRODUCE
  CLEANING
  PANTRY
  BAKERY
  PETS
  HOUSEHOLD
}

model GroceryItem {
  id               String          @id @default(uuid())
  userId           String
  user             User            @relation(fields: [userId], references: [id], onDelete: Cascade)
  name             String          @db.VarChar(100)
  unit             String          @db.VarChar(30)
  idealQuantity    Decimal         @db.Decimal(10, 2)
  currentQuantity  Decimal         @default(0) @db.Decimal(10, 2)
  estimatedPrice   Decimal         @db.Decimal(10, 2)
  category         GroceryCategory
  createdAt        DateTime        @default(now())
  updatedAt        DateTime        @updatedAt

  @@index([userId, category, name])
}

model GroceryBudget {
  id        String   @id @default(uuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  amount    Decimal  @db.Decimal(12, 2)
  createdAt DateTime @default(now())

  @@index([userId, createdAt])
}
```

Legacy category strings map 1:1 to the enum (for the import script):
Alimentos→FOOD, Bebidas→BEVERAGES, Carnes→MEAT, Congelados→FROZEN,
Frios e Laticínios→DAIRY_AND_DELI, Higiene Pessoal→PERSONAL_CARE,
Hortifruti→PRODUCE, Limpeza→CLEANING, Mercearia→PANTRY, Padaria→BAKERY,
Pets→PETS, Utilidades Domésticas→HOUSEHOLD. The pt-BR labels live in the
mobile app, not the API.

`@@index([userId, category, name])` serves the list's `WHERE userId ORDER
BY category, name`. Name order within a category follows the database's
collation — Portuguese-aware on the dev DB; a production DB created with
the `C` collation would sort uppercase before lowercase (check when
provisioning it). Quantity/price columns are `Decimal(10,2)` (legacy
precision) → DTOs cap them at `99999999.99`; the budget is
`Decimal(12,2)` → capped at `MAX_MONEY_AMOUNT`.

## API surface

| Method | Path | Auth | Request DTO | Response DTO | Error cases |
|---|---|---|---|---|---|
| GET | `/grocery/items` | Bearer | — | `GroceryItemDto[]` | 401 |
| POST | `/grocery/items` | Bearer | `CreateGroceryItemDto` | `GroceryItemDto` | 400, 401 |
| PATCH | `/grocery/items/:id` | Bearer | `UpdateGroceryItemDto` | `GroceryItemDto` | 400, 401, 404 |
| DELETE | `/grocery/items/:id` | Bearer | — | 204 | 401, 404 |
| GET | `/grocery/budget` | Bearer | — | `GroceryBudgetDto` `{ amount: string \| null; setAt: string \| null }` | 401 |
| POST | `/grocery/budget` | Bearer | `SetGroceryBudgetDto` `{ amount: number }` | `GroceryBudgetDto` | 400, 401 |
| GET | `/grocery/summary` | Bearer | — | `GrocerySummaryDto` `{ totalItemCount: number; missingItemCount: number; estimatedPurchaseTotal: string }` | 401 |

`GroceryItemDto`: `id, name, unit, idealQuantity, currentQuantity,
estimatedPrice, category, missing, createdAt, updatedAt` — decimals as
strings (same convention as every other money/quantity DTO); `missing`
derived per row so the client doesn't compare decimal strings.

The quick +/− on a row is a plain `PATCH /grocery/items/:id` with the new
`currentQuantity` — no dedicated endpoint.

`estimatedPurchaseTotal` is computed with `Prisma.Decimal` over the
user's items in memory (a household list is tens of items, not
thousands) — one query, exact decimals, no float math.

No module imports another feature's service — grocery is self-contained.

## Mobile screens

Lives under the **Mais** tab (see `docs/specs/navigation/design.md` →
Amendment): new row `more-grocery` ("Mercado").

| Screen | Route | Reads | Writes | Notes |
|---|---|---|---|---|
| `GroceryScreen` | stack `Grocery` | `GET /grocery/items`, `GET /grocery/budget`, `GET /grocery/summary` | `PATCH` (quick ±) | Budget card (ProgressBar with tone by threshold, remaining balance), "Faltando" filter, items grouped by category with ± stepper (`IconButton`), share button (enabled once list + settled summary are loaded) |
| `GroceryItemFormScreen` | modal `GroceryItemForm { item? }` | — | `POST`/`PATCH /grocery/items`, `DELETE /grocery/items/:id` | Category picker (fixed 12-value list, pt-BR labels); "Excluir item" when editing |
| Budget sheet | inline on `GroceryScreen` (`BottomSheet`) | — | `POST /grocery/budget` | Single amount field |

`ProgressBar` gets an optional `tone` (`primary` default, `success`,
`warning`, `danger`) — the budget bar is the first colored use. New
`components/ui/IconButton` (touch-target square, `primaryMuted` fill)
for the stepper.

Share: `Share.share({ message })` from `react-native` with the text
built by a pure, unit-tested `buildShoppingListMessage(items, total)` in
`apps/mobile/src/lib/grocery-display.ts` — no Expo module needed.

Cache: the item form invalidates `["grocery", "items"]` and
`["grocery", "summary"]` (never the budget, which items don't change);
the budget sheet writes its POST response straight into
`["grocery", "budget"]`. Quick ± is optimistic: the tap writes the new
quantity into the items cache synchronously (reading the latest cached
value, so fast taps compound), the PATCH carries the absolute quantity,
and a shared mutation `scope` sends PATCHes one at a time in tap order.
PATCH responses are not written back (they'd overwrite newer taps); the
summary is invalidated without awaiting; a failure refetches the list.

## Shared types

`packages/shared-types/src/grocery.ts`: `groceryCategorySchema`/
`GroceryCategory`, `GROCERY_CATEGORIES`, `groceryItemSchema`/
`GroceryItem`, `createGroceryItemInputSchema`/`CreateGroceryItemInput`,
`updateGroceryItemInputSchema`/`UpdateGroceryItemInput`,
`groceryBudgetSchema`/`GroceryBudget`, `setGroceryBudgetInputSchema`/
`SetGroceryBudgetInput`, `grocerySummarySchema`/`GrocerySummary`.

## Error handling

- Budget exceeded → visual indicator only (danger bar/balance), never a
  blocking error on item create/update.
- Any API failure → generic pt-BR copy, never the API `message`.
- Quick ± failure → toast "Não foi possível atualizar a quantidade." and
  the row keeps its previous value.
