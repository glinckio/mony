# Design — Categories

## Data model (Prisma)

```prisma
enum CategoryType {
  INCOME
  EXPENSE
}

model Category {
  id        String       @id @default(uuid())
  userId    String?      // null = system default category
  user      User?        @relation(fields: [userId], references: [id], onDelete: Cascade)
  name      String       @db.VarChar(50)
  type      CategoryType
  color     String       @db.VarChar(7) // hex, e.g. "#3B82F6"
  icon      String       @db.VarChar(50) // key into the app's icon set
  createdAt DateTime     @default(now())

  transactions Transaction[] // added when `transactions` feature lands

  @@index([userId])
}
```

System categories are seeded via a Prisma seed script
(`apps/api/prisma/seed.ts`) — a fixed list covering common income/expense
types, ported from the ~35-icon palette in the legacy `categorias.php`.
Category is **not** workspace-scoped (matches legacy — categories are
global to the user across both workspaces).

## API surface

| Method | Path | Auth | Request DTO | Response DTO | Error cases |
|---|---|---|---|---|---|
| GET | `/categories?type=INCOME\|EXPENSE` | Bearer | — | `CategoryDto[]` | 401 |
| POST | `/categories` | Bearer | `CreateCategoryDto` | `CategoryDto` | 400, 401 |
| PATCH | `/categories/:id` | Bearer | `UpdateCategoryDto` | `CategoryDto` | 400, 401, 404 (not owner or system category) |
| DELETE | `/categories/:id?replacementCategoryId=` | Bearer | — | 204 | 400 (needs replacement), 401, 404 |

## Mobile screens

| Screen | Route | Reads | Writes | Notes |
|---|---|---|---|---|
| `CategoriesScreen` | `/categories` | `GET /categories` | `POST`/`PATCH`/`DELETE` | List grouped by type, system categories shown without edit/delete affordances |
| `CategoryFormScreen` (modal) | `/categories/new`, `/categories/:id/edit` | — | `POST`/`PATCH /categories/:id` | Name, type, color picker, icon picker |
| Delete-with-replacement dialog | inline on `CategoriesScreen` | `GET /categories?type=` | `DELETE /categories/:id` | Shown only when the API reports the category is in use (400 response drives this UI, not a separate "check usage" call) |

## Shared types

`packages/shared-types/src/category.ts`: `Category`, `CreateCategoryInput`,
`UpdateCategoryInput` zod schemas, `CategoryType`.

## Error handling

- Delete without replacement → surfaces the replacement picker inline,
  doesn't just show a generic error.
- Attempting to edit/delete a system category → the UI never exposes the
  action (buttons hidden), but the API still enforces it independently.
