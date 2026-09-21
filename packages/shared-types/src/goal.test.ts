import { createGoalInputSchema, updateGoalInputSchema } from "./goal";

describe("createGoalInputSchema", () => {
  const base = { title: "Viagem", targetAmount: 5000 };

  it("accepts a minimal valid payload", () => {
    expect(createGoalInputSchema.safeParse(base).success).toBe(true);
  });

  it("rejects an empty title", () => {
    expect(createGoalInputSchema.safeParse({ ...base, title: "" }).success).toBe(false);
  });

  it("rejects a non-positive targetAmount", () => {
    expect(createGoalInputSchema.safeParse({ ...base, targetAmount: 0 }).success).toBe(false);
  });

  it("accepts an optional non-negative currentAmount", () => {
    expect(createGoalInputSchema.safeParse({ ...base, currentAmount: 0 }).success).toBe(true);
    expect(createGoalInputSchema.safeParse({ ...base, currentAmount: 1500 }).success).toBe(true);
  });

  it("rejects a negative currentAmount", () => {
    expect(createGoalInputSchema.safeParse({ ...base, currentAmount: -1 }).success).toBe(false);
  });

  it("does not accept a completed field", () => {
    const result = createGoalInputSchema.safeParse({ ...base, completed: true });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).not.toHaveProperty("completed");
    }
  });
});

describe("updateGoalInputSchema", () => {
  it("accepts an empty payload (all fields optional)", () => {
    expect(updateGoalInputSchema.safeParse({}).success).toBe(true);
  });

  it("accepts a completed flag independent of currentAmount", () => {
    expect(updateGoalInputSchema.safeParse({ completed: true }).success).toBe(true);
  });
});
