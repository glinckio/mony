import { formatCurrency, type GroceryCategory, type GroceryItem } from "@mony/shared-types";

import type { ProgressTone } from "../components/ui";

// Legacy `mercado.php` labels. The enum is declared in this same
// (alphabetical-by-label) order, so the API's `ORDER BY category` already
// groups items in the order they're listed here.
export const GROCERY_CATEGORY_LABELS: Record<GroceryCategory, string> = {
  FOOD: "Alimentos",
  BEVERAGES: "Bebidas",
  MEAT: "Carnes",
  FROZEN: "Congelados",
  DAIRY_AND_DELI: "Frios e Laticínios",
  PERSONAL_CARE: "Higiene Pessoal",
  PRODUCE: "Hortifruti",
  CLEANING: "Limpeza",
  PANTRY: "Mercearia",
  BAKERY: "Padaria",
  PETS: "Pets",
  HOUSEHOLD: "Utilidades Domésticas",
};

export interface BudgetUsage {
  // min(100, estimate / budget * 100); 0 without a (positive) budget.
  percent: number;
  tone: ProgressTone;
  // max(0, budget - estimate), as a plain number for display.
  remaining: number;
  overBudget: boolean;
}

// Legacy thresholds: <= 70% success, <= 90% warning, else danger.
export function budgetUsage(budget: number | null, estimate: number): BudgetUsage {
  const hasBudget = budget !== null && budget > 0;
  const percent = hasBudget ? Math.min(100, (estimate / budget) * 100) : 0;
  const tone: ProgressTone = percent <= 70 ? "success" : percent <= 90 ? "warning" : "danger";
  const safeBudget = budget ?? 0;
  return {
    percent,
    tone,
    remaining: Math.max(0, safeBudget - estimate),
    // Any set budget, including R$ 0 (legacy: red whenever budget - estimate < 0).
    overBudget: budget !== null && estimate > budget,
  };
}

// "1.50" -> "1,5"; "2.00" -> "2" — quantities read like a shopping list,
// not like money.
export function formatQuantity(value: string | number): string {
  return Number(value).toLocaleString("pt-BR", { maximumFractionDigits: 2 });
}

// Quantity still to buy for a missing item (ideal - current), computed in
// integer hundredths so e.g. 1.1 - 0.2 doesn't print 0.9000000000000001.
export function quantityToBuy(item: GroceryItem): number {
  const cents =
    Math.round(Number(item.idealQuantity) * 100) - Math.round(Number(item.currentQuantity) * 100);
  return Math.max(0, cents) / 100;
}

// Legacy WhatsApp message format, handed to the native share sheet:
// missing items grouped by category, then the estimated total.
export function buildShoppingListMessage(items: GroceryItem[], estimatedTotal: string): string {
  const byCategory = new Map<GroceryCategory, string[]>();
  for (const item of items) {
    if (!item.missing) continue;
    const lines = byCategory.get(item.category) ?? [];
    lines.push(`- ${item.name}: ${formatQuantity(quantityToBuy(item))} ${item.unit}`);
    byCategory.set(item.category, lines);
  }

  let message = "*Lista de Compras*\n\n";
  for (const [category, lines] of byCategory) {
    message += `*${GROCERY_CATEGORY_LABELS[category]}*\n${lines.join("\n")}\n\n`;
  }
  return `${message}*Valor estimado total: ${formatCurrency(estimatedTotal)}*`;
}
