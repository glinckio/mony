const CURRENCY_FORMATTER = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

export function formatAmountDisplay(amount: number | undefined): string {
  if (amount === undefined || Number.isNaN(amount)) return "";
  return CURRENCY_FORMATTER.format(amount);
}

// Treats the digits typed as cents (e.g. "150050" -> 1500.50) — the
// standard BR currency-input UX, avoids any ambiguity around where the
// user meant to place a decimal separator.
export function parseAmountInput(text: string): number | undefined {
  const digits = text.replace(/\D/g, "");
  if (!digits) return undefined;
  return Number(digits) / 100;
}
