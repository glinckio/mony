import { CATEGORY_ICONS, createCategoryInputSchema, updateCategoryInputSchema } from "./category";

const validIcon = CATEGORY_ICONS[0];

describe("createCategoryInputSchema", () => {
  it("accepts a valid payload without a color", () => {
    const result = createCategoryInputSchema.safeParse({
      name: "Alimentação",
      type: "EXPENSE",
      icon: validIcon,
    });
    expect(result.success).toBe(true);
  });

  it("accepts a valid hex color", () => {
    const result = createCategoryInputSchema.safeParse({
      name: "Salário",
      type: "INCOME",
      color: "#3B82F6",
      icon: validIcon,
    });
    expect(result.success).toBe(true);
  });

  it("rejects an empty name", () => {
    const result = createCategoryInputSchema.safeParse({
      name: "",
      type: "EXPENSE",
      icon: validIcon,
    });
    expect(result.success).toBe(false);
  });

  it("rejects a name over 50 characters", () => {
    const result = createCategoryInputSchema.safeParse({
      name: "a".repeat(51),
      type: "EXPENSE",
      icon: validIcon,
    });
    expect(result.success).toBe(false);
  });

  it("rejects a malformed hex color", () => {
    const result = createCategoryInputSchema.safeParse({
      name: "Alimentação",
      type: "EXPENSE",
      color: "blue",
      icon: validIcon,
    });
    expect(result.success).toBe(false);
  });

  it("rejects an icon outside the fixed set", () => {
    const result = createCategoryInputSchema.safeParse({
      name: "Alimentação",
      type: "EXPENSE",
      icon: "not-a-real-icon",
    });
    expect(result.success).toBe(false);
  });

  it("rejects an invalid type", () => {
    const result = createCategoryInputSchema.safeParse({
      name: "Alimentação",
      type: "SAVINGS",
      icon: validIcon,
    });
    expect(result.success).toBe(false);
  });
});

describe("updateCategoryInputSchema", () => {
  it("accepts an empty payload (all fields optional)", () => {
    const result = updateCategoryInputSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it("accepts a partial update", () => {
    const result = updateCategoryInputSchema.safeParse({ name: "Novo nome" });
    expect(result.success).toBe(true);
  });

  it("does not accept a type field", () => {
    const result = updateCategoryInputSchema.safeParse({ type: "INCOME" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).not.toHaveProperty("type");
    }
  });
});
