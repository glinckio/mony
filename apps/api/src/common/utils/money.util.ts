import { Prisma } from "@prisma/client";

// Largest value a `@db.Decimal(12, 2)` money column can hold. DTOs cap
// amounts here so an oversized value is a 400, not a Postgres numeric
// overflow surfacing as a 500.
export const MAX_MONEY_AMOUNT = 9_999_999_999.99;

// Centralizes every place money leaves Prisma's `Decimal` and becomes a
// plain string for a DTO — never a JS float, never ad-hoc `.toFixed()`
// scattered across services. Pairs with `Prisma.Decimal`'s own exact
// arithmetic (`.add`/`.sub`) for anything computed, not just stored.
export function decimalToString(value: Prisma.Decimal | null | undefined): string {
  return (value ?? new Prisma.Decimal(0)).toFixed(2);
}
