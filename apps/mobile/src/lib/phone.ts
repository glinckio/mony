// Formats a raw digit string as a BR phone for display — the form itself
// still stores/validates raw digits (10-11), matching the shared zod
// schema in @mony/shared-types.
export function formatPhone(digits: string): string {
  const clean = digits.replace(/\D/g, "").slice(0, 11);
  if (clean.length <= 2) return clean;
  if (clean.length <= 6) return `(${clean.slice(0, 2)}) ${clean.slice(2)}`;
  if (clean.length <= 10) return `(${clean.slice(0, 2)}) ${clean.slice(2, 6)}-${clean.slice(6)}`;
  return `(${clean.slice(0, 2)}) ${clean.slice(2, 7)}-${clean.slice(7)}`;
}

export function unformatPhone(value: string): string {
  return value.replace(/\D/g, "").slice(0, 11);
}
