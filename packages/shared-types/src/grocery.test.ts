import {
  GROCERY_CATEGORIES,
  createGroceryItemInputSchema,
  setGroceryBudgetInputSchema,
  updateGroceryItemInputSchema,
} from "./grocery";

describe("createGroceryItemInputSchema", () => {
  const base = {
    name: "Arroz",
    unit: "kg",
    idealQuantity: 5,
    estimatedPrice: 6.49,
    category: "PANTRY" as const,
  };

  it("accepts a minimal valid payload, currentQuantity optional", () => {
    expect(createGroceryItemInputSchema.safeParse(base).success).toBe(true);
    expect(createGroceryItemInputSchema.safeParse({ ...base, currentQuantity: 1.5 }).success).toBe(
      true,
    );
  });

  it("has exactly the 12 legacy categories", () => {
    expect(GROCERY_CATEGORIES).toHaveLength(12);
  });

  it("rejects blank name/unit and an unknown category, with pt-BR messages", () => {
    const result = createGroceryItemInputSchema.safeParse({
      ...base,
      name: "  ",
      unit: "",
      category: "SNACKS",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const messages = result.error.issues.map((issue) => issue.message);
      expect(messages).toEqual(
        expect.arrayContaining([
          "Nome é obrigatório",
          "Unidade é obrigatória",
          "Categoria é obrigatória",
        ]),
      );
    }
  });

  it("allows zero but not negative quantities/price, and at most 2 decimals", () => {
    expect(
      createGroceryItemInputSchema.safeParse({ ...base, idealQuantity: 0, estimatedPrice: 0 })
        .success,
    ).toBe(true);
    expect(createGroceryItemInputSchema.safeParse({ ...base, idealQuantity: -1 }).success).toBe(
      false,
    );
    expect(createGroceryItemInputSchema.safeParse({ ...base, currentQuantity: -0.5 }).success).toBe(
      false,
    );
    expect(createGroceryItemInputSchema.safeParse({ ...base, estimatedPrice: 1.999 }).success).toBe(
      false,
    );
  });

  it("caps values at the Decimal(10,2) column limit", () => {
    expect(
      createGroceryItemInputSchema.safeParse({ ...base, idealQuantity: 100_000_000 }).success,
    ).toBe(false);
  });

  it("allows a name up to 100 characters", () => {
    expect(createGroceryItemInputSchema.safeParse({ ...base, name: "x".repeat(100) }).success).toBe(
      true,
    );
    const result = createGroceryItemInputSchema.safeParse({ ...base, name: "x".repeat(101) });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe("Nome deve ter no máximo 100 caracteres");
    }
  });

  it("reports missing quantity/price fields with pt-BR 'required' messages", () => {
    const result = createGroceryItemInputSchema.safeParse({
      name: "Arroz",
      unit: "kg",
      category: "PANTRY",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const messages = result.error.issues.map((issue) => issue.message);
      expect(messages).toEqual(
        expect.arrayContaining(["Quantidade ideal é obrigatória", "Preço estimado é obrigatório"]),
      );
      // currentQuantity is optional (defaults to 0 server-side).
      expect(messages).not.toContain("Quantidade atual é obrigatória");
    }
  });

  it("allows a unit up to 30 characters (legacy column width)", () => {
    expect(createGroceryItemInputSchema.safeParse({ ...base, unit: "x".repeat(30) }).success).toBe(
      true,
    );
    expect(createGroceryItemInputSchema.safeParse({ ...base, unit: "x".repeat(31) }).success).toBe(
      false,
    );
  });
});

describe("updateGroceryItemInputSchema", () => {
  it("accepts a partial update (e.g. the quick ± stepper)", () => {
    expect(updateGroceryItemInputSchema.safeParse({ currentQuantity: 3 }).success).toBe(true);
    expect(updateGroceryItemInputSchema.safeParse({}).success).toBe(true);
  });

  it("still validates the fields that are sent (quantity never below 0)", () => {
    expect(updateGroceryItemInputSchema.safeParse({ currentQuantity: -1 }).success).toBe(false);
    expect(updateGroceryItemInputSchema.safeParse({ currentQuantity: 0.001 }).success).toBe(false);
    expect(updateGroceryItemInputSchema.safeParse({ category: "SNACKS" }).success).toBe(false);
    expect(updateGroceryItemInputSchema.safeParse({ name: " " }).success).toBe(false);
  });
});

describe("setGroceryBudgetInputSchema", () => {
  it("accepts zero and positive amounts, rejects negatives and overflow", () => {
    expect(setGroceryBudgetInputSchema.safeParse({ amount: 0 }).success).toBe(true);
    expect(setGroceryBudgetInputSchema.safeParse({ amount: 800 }).success).toBe(true);
    expect(setGroceryBudgetInputSchema.safeParse({ amount: -1 }).success).toBe(false);
    expect(setGroceryBudgetInputSchema.safeParse({ amount: 1e13 }).success).toBe(false);
  });

  it("allows cents but no more than 2 decimals", () => {
    expect(setGroceryBudgetInputSchema.safeParse({ amount: 650.5 }).success).toBe(true);
    expect(setGroceryBudgetInputSchema.safeParse({ amount: 1.15 }).success).toBe(true);
    expect(setGroceryBudgetInputSchema.safeParse({ amount: 10.999 }).success).toBe(false);
  });
});
