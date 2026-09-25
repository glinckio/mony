// Free-typed pt-BR decimals ("1,5", "12,75") for fields that aren't money
// (money uses the cents mask in currency-mask.ts): quantities, rates.
// Keeps digits and at most one comma with two decimals, so what's shown
// can't drift from what gets submitted.
export function sanitizeDecimalInput(text: string): string {
  const [integer = "", ...decimals] = text
    .replace(/\./g, ",")
    .replace(/[^\d,]/g, "")
    .split(",");
  return decimals.length > 0 ? `${integer},${decimals.join("").slice(0, 2)}` : integer;
}

// "1,5" -> 1.5; "" -> undefined (so zod reports "required").
export function parseDecimalInput(text: string): number | undefined {
  if (!text) return undefined;
  const value = Number(text.replace(",", "."));
  return Number.isNaN(value) ? undefined : value;
}

// 1.5 -> "1,5"; undefined -> "" — seeds the display state from a number.
export function formatDecimalInput(value: number | string | null | undefined): string {
  if (value === null || value === undefined || value === "") return "";
  return String(Number(value)).replace(".", ",");
}
