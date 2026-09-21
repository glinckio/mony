# Design — Categories

## Data model (Prisma)

```prisma
enum CategoryType {
  INCOME
  EXPENSE
}

model Category {
  id        String       @id @default(uuid())
  userId    String
  user      User         @relation(fields: [userId], references: [id], onDelete: Cascade)
  name      String       @db.VarChar(50)
  type      CategoryType
  color     String       @db.VarChar(7) // hex, e.g. "#3B82F6"
  icon      String       @db.VarChar(50) // key into the app's icon set

  createdAt DateTime     @default(now())

  transactions Transaction[] // added when `transactions` feature lands

  @@index([userId])
}
```

No system/shared default categories — confirmed against legacy
(`legacy_php_reference/u676707464_monitorizze.sql`'s `categorias` table
has no rows with a null `usuario_id`; every category is user-owned).
Every user starts with an empty list and creates their own, same as
legacy. `userId` is therefore required, not optional — no seed script.

The icon *picker* still needs a fixed set of selectable icon keys (ported
from the ~35-icon Font Awesome palette in legacy `categorias.php`, mapped
to `@expo/vector-icons` names) — that's a static list shipped in
`packages/shared-types`, not seeded data.

Category is **not** workspace-scoped (matches legacy — categories are
global to the user across both workspaces).

## API surface

| Method | Path | Auth | Request DTO | Response DTO | Error cases |
|---|---|---|---|---|---|
| GET | `/categories?type=INCOME\|EXPENSE` | Bearer | — | `CategoryDto[]` | 401 |
| POST | `/categories` | Bearer | `CreateCategoryDto` | `CategoryDto` | 400, 401 |
| PATCH | `/categories/:id` | Bearer | `UpdateCategoryDto` | `CategoryDto` | 400, 401, 404 (not owner) |
| DELETE | `/categories/:id?replacementCategoryId=` | Bearer | — | 204 | 400 (needs replacement), 401, 404 |

## Mobile screens

| Screen | Route | Reads | Writes | Notes |
|---|---|---|---|---|
| `CategoriesScreen` | `/categories` | `GET /categories` | `POST`/`PATCH`/`DELETE` | List grouped by type |
| `CategoryFormScreen` (modal) | `/categories/new`, `/categories/:id/edit` | — | `POST`/`PATCH /categories/:id` | Name, type, color picker, icon picker |
| Delete-with-replacement dialog | inline on `CategoriesScreen` | `GET /categories?type=` | `DELETE /categories/:id` | Shown only when the API reports the category is in use (400 response drives this UI, not a separate "check usage" call) |

## Shared types

`packages/shared-types/src/category.ts`: `Category`, `CreateCategoryInput`,
`UpdateCategoryInput` zod schemas, `CategoryType`, plus the fixed
`CATEGORY_ICONS` key list used by both the zod `icon` validation and the
mobile icon picker.

## Error handling

- Delete without replacement → surfaces the replacement picker inline,
  doesn't just show a generic error.
