import {
  createTransactionInputSchema,
  formatCurrency,
  updateTransactionInputSchema,
} from "./transaction";

describe("createTransactionInputSchema", () => {
  const base = {
    categoryId: "cat-1",
    type: "EXPENSE" as const,
    description: "Aluguel",
    amount: 1500.5,
    date: "2026-01-15",
  };

  it("accepts a valid payload without status/recurring", () => {
    expect(createTransactionInputSchema.safeParse(base).success).toBe(true);
  });

  it("rejects a non-positive amount", () => {
    expect(
      createTransactionInputSchema.safeParse({ ...base, amount: 0 }).success,
    ).toBe(false);
    expect(
      createTransactionInputSchema.safeParse({ ...base, amount: -10 }).success,
    ).toBe(false);
  });

  it("rejects an amount with more than 2 decimal places", () => {
    expect(
      createTransactionInputSchema.safeParse({ ...base, amount: 10.123 }).success,
    ).toBe(false);
  });

  it("accepts ordinary 2-decimal amounts that lose precision under float multiplication", () => {
    // e.g. 1.15 * 100 === 114.99999999999999 in JS — a naive
    // `value * 100` check would wrongly reject these.
    for (const amount of [1.15, 19.99, 8.29, 0.1, 100.2]) {
      expect(createTransactionInputSchema.safeParse({ ...base, amount }).success).toBe(true);
    }
  });

  it("rejects an empty description", () => {
    expect(
      createTransactionInputSchema.safeParse({ ...base, description: "" }).success,
    ).toBe(false);
  });

  it("accepts recurringMonths within 1-60", () => {
    expect(
      createTransactionInputSchema.safeParse({
        ...base,
        recurring: true,
        recurringMonths: 12,
      }).success,
    ).toBe(true);
  });

  it("rejects recurringMonths outside 1-60", () => {
    expect(
      createTransactionInputSchema.safeParse({
        ...base,
        recurring: true,
        recurringMonths: 61,
      }).success,
    ).toBe(false);
    expect(
      createTransactionInputSchema.safeParse({
        ...base,
        recurring: true,
        recurringMonths: 0,
      }).success,
    ).toBe(false);
  });
});

describe("updateTransactionInputSchema", () => {
  it("accepts an empty payload (all fields optional)", () => {
    expect(updateTransactionInputSchema.safeParse({}).success).toBe(true);
  });

  it("does not accept a type field", () => {
    const result = updateTransactionInputSchema.safeParse({ type: "INCOME" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).not.toHaveProperty("type");
    }
  });
});

describe("formatCurrency", () => {
  it("formats a decimal string as pt-BR currency", () => {
    expect(formatCurrency("1500.5")).toBe("R$ 1.500,50");
  });

  it("formats zero correctly", () => {
    expect(formatCurrency("0")).toBe("R$ 0,00");
  });
});
