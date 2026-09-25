import type { GroceryItem } from "@mony/shared-types";

import {
  budgetUsage,
  buildShoppingListMessage,
  formatQuantity,
  quantityToBuy,
} from "./grocery-display";

const item = (overrides: Partial<GroceryItem>): GroceryItem => ({
  id: "i",
  name: "Arroz",
  unit: "kg",
  idealQuantity: "5.00",
  currentQuantity: "1.50",
  estimatedPrice: "6.49",
  category: "PANTRY",
  missing: true,
  createdAt: "2026-09-25T12:00:00.000Z",
  updatedAt: "2026-09-25T12:00:00.000Z",
  ...overrides,
});

describe("budgetUsage", () => {
  it("uses the legacy thresholds: <=70% success, <=90% warning, else danger", () => {
    expect(budgetUsage(1000, 700).tone).toBe("success");
    expect(budgetUsage(1000, 701).tone).toBe("warning");
    expect(budgetUsage(1000, 900).tone).toBe("warning");
    expect(budgetUsage(1000, 901).tone).toBe("danger");
  });

  it("caps the percent at 100 and floors the remaining balance at 0 when over budget", () => {
    expect(budgetUsage(500, 800)).toEqual({
      percent: 100,
      tone: "danger",
      remaining: 0,
      overBudget: true,
    });
  });

  it("reports the remaining balance under budget", () => {
    expect(budgetUsage(800, 200)).toMatchObject({ percent: 25, remaining: 600, overBudget: false });
  });

  it("is 0% without a positive budget, and never over budget when none is set", () => {
    expect(budgetUsage(null, 300)).toMatchObject({ percent: 0, overBudget: false });
  });

  it("treats an explicit R$ 0 budget as exceeded by any estimate (legacy red balance)", () => {
    expect(budgetUsage(0, 300)).toMatchObject({ percent: 0, remaining: 0, overBudget: true });
    expect(budgetUsage(0, 0)).toMatchObject({ overBudget: false });
  });
});

describe("quantityToBuy / formatQuantity", () => {
  it("subtracts without float noise and reads like a shopping list", () => {
    expect(quantityToBuy(item({ idealQuantity: "1.10", currentQuantity: "0.20" }))).toBe(0.9);
    expect(formatQuantity(3.5)).toBe("3,5");
    expect(formatQuantity("2.00")).toBe("2");
  });
});

describe("buildShoppingListMessage", () => {
  it("lists only missing items, grouped by category, with the estimated total (legacy format)", () => {
    const message = buildShoppingListMessage(
      [
        item({
          name: "Sabonete",
          unit: "un",
          idealQuantity: "4.00",
          currentQuantity: "0.00",
          category: "PERSONAL_CARE",
        }),
        item({ name: "Detergente", unit: "un", category: "CLEANING", missing: false }),
        item({ name: "Arroz" }),
        item({ name: "Feijão", idealQuantity: "2.00", currentQuantity: "0.00" }),
      ],
      "48.72",
    );

    expect(message).toMatch(/^\*Lista de Compras\*\n\n/);
    expect(message).toContain("*Higiene Pessoal*\n- Sabonete: 4 un\n\n");
    expect(message).toContain("*Mercearia*\n- Arroz: 3,5 kg\n- Feijão: 2 kg\n\n");
    expect(message).not.toContain("Detergente");
    expect(message).not.toContain("Limpeza");
    expect(message).toMatch(/\*Valor estimado total: R\$\s48,72\*$/);
  });
});
