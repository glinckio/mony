import { nonNegativeAmountSchema, positiveAmountSchema } from "./money";

describe("positiveAmountSchema", () => {
  it("rejects zero and negative values", () => {
    expect(positiveAmountSchema.safeParse(0).success).toBe(false);
    expect(positiveAmountSchema.safeParse(-10).success).toBe(false);
  });

  it("accepts ordinary 2-decimal amounts that lose precision under float multiplication", () => {
    for (const amount of [1.15, 19.99, 8.29, 0.1, 100.2]) {
      expect(positiveAmountSchema.safeParse(amount).success).toBe(true);
    }
  });

  it("rejects more than 2 decimal places", () => {
    expect(positiveAmountSchema.safeParse(10.123).success).toBe(false);
  });

  it("reports a pt-BR message when the field is missing entirely, not just when it's the wrong type", () => {
    const result = positiveAmountSchema.safeParse(undefined);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]!.message).toBe("Valor é obrigatório");
    }
  });
});

describe("nonNegativeAmountSchema", () => {
  it("accepts zero", () => {
    expect(nonNegativeAmountSchema.safeParse(0).success).toBe(true);
  });

  it("rejects negative values", () => {
    expect(nonNegativeAmountSchema.safeParse(-1).success).toBe(false);
  });

  it("rejects more than 2 decimal places", () => {
    expect(nonNegativeAmountSchema.safeParse(5.999).success).toBe(false);
  });
});
