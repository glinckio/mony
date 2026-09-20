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
  unit             String          @db.VarChar(20)
  idealQuantity    Decimal         @db.Decimal(10, 2)
  currentQuantity  Decimal         @default(0) @db.Decimal(10, 2)
  estimatedPrice   Decimal         @db.Decimal(10, 2)
  category         GroceryCategory
  createdAt        DateTime        @default(now())
  updatedAt        DateTime        @updatedAt

  @@index([userId])
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

## API surface

| Method | Path | Auth | Request DTO | Response DTO | Error cases |
|---|---|---|---|---|---|
| GET | `/grocery/items` | Bearer | — | `GroceryItemDto[]` | 401 |
| POST | `/grocery/items` | Bearer | `CreateGroceryItemDto` | `GroceryItemDto` | 400, 401 |
| PATCH | `/grocery/items/:id` | Bearer | `UpdateGroceryItemDto` | `GroceryItemDto` | 400, 401, 404 |
| DELETE | `/grocery/items/:id` | Bearer | — | 204 | 401, 404 |
| GET | `/grocery/budget` | Bearer | — | `{ amount: string \| null; setAt: string \| null }` | 401 |
| POST | `/grocery/budget` | Bearer | `{ amount: number }` | `{ amount: string; setAt: string }` | 400, 401 |
| GET | `/grocery/summary` | Bearer | — | `{ estimatedPurchaseTotal: string; missingItemCount: number }` | 401 |

## Mobile screens

| Screen | Route | Reads | Writes | Notes |
|---|---|---|---|---|
| `GroceryScreen` | `/grocery` | `GET /grocery/items`, `GET /grocery/budget`, `GET /grocery/summary` | `POST`/`PATCH`/`DELETE /grocery/items`, `POST /grocery/budget` | Budget progress bar (informational, no blocking), missing-items filter |
| `GroceryItemFormScreen` (modal) | `/grocery/items/new`, `/grocery/items/:id/edit` | — | `POST`/`PATCH /grocery/items` | Category picker (fixed 12-value list) |

## Shared types

`packages/shared-types/src/grocery.ts`: `GroceryItem`,
`CreateGroceryItemInput`, `UpdateGroceryItemInput`, `GroceryCategory` enum.

## Error handling

- Budget exceeded → visual indicator only (red balance), never a blocking
  error on item create/update.
