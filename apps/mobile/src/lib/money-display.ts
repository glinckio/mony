// Money pieces for the ledger typography: the hero numbers print "R$" and
// the cents smaller than the integer part, and ledger columns carry the
// sign (+ income / − expense) in its own column. Formatting is manual
// (not Intl) so Hermes and Jest render exactly the same characters.

export const MINUS = "−";

export interface MoneyParts {
  negative: boolean;
  // "2.059"
  integer: string;
  // "45"
  cents: string;
}

export function toCents(value: string | number): number {
  return Math.round(Number(value) * 100);
}

export function splitMoney(value: string | number): MoneyParts {
  const cents = toCents(value);
  const absolute = Math.abs(cents);
  const integer = Math.floor(absolute / 100)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return { negative: cents < 0, integer, cents: String(absolute % 100).padStart(2, "0") };
}

// "2.059,45" — no currency, no sign.
export function formatAmount(value: string | number): string {
  const { integer, cents } = splitMoney(value);
  return `${integer},${cents}`;
}

// "R$ 2.059,45" / "− R$ 320,00".
export function formatMoney(value: string | number): string {
  const parts = splitMoney(value);
  return `${parts.negative ? `${MINUS} ` : ""}R$ ${parts.integer},${parts.cents}`;
}

// Ledger entry with its direction: "+ 5.200,00" / "− 212,40".
export function formatSigned(value: string | number, direction: "in" | "out"): string {
  return `${direction === "in" ? "+" : MINUS} ${formatAmount(value)}`;
}

// Read-aloud form for screen readers: "2059 reais e 45 centavos".
export function spokenMoney(value: string | number): string {
  const cents = toCents(value);
  const absolute = Math.abs(cents);
  const reais = Math.floor(absolute / 100);
  const rest = absolute % 100;
  const sign = cents < 0 ? "menos " : "";
  const reaisText = `${reais} ${reais === 1 ? "real" : "reais"}`;
  return rest > 0 ? `${sign}${reaisText} e ${rest} centavos` : `${sign}${reaisText}`;
}
