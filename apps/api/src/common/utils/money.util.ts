import { Prisma } from "@prisma/client";

// Centralizes every place money leaves Prisma's `Decimal` and becomes a
// plain string for a DTO — never a JS float, never ad-hoc `.toFixed()`
// scattered across services. Pairs with `Prisma.Decimal`'s own exact
// arithmetic (`.add`/`.sub`) for anything computed, not just stored.
export function decimalToString(value: Prisma.Decimal | null | undefined): string {
  return (value ?? new Prisma.Decimal(0)).toFixed(2);
}
