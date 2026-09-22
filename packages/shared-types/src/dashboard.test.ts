import { dashboardDataSchema, dashboardPeriodSchema } from "./dashboard";

describe("dashboardPeriodSchema", () => {
  it("accepts the four known periods", () => {
    for (const period of ["day", "week", "month", "custom"]) {
      expect(dashboardPeriodSchema.safeParse(period).success).toBe(true);
    }
  });

  it("rejects an unknown period", () => {
    expect(dashboardPeriodSchema.safeParse("year").success).toBe(false);
  });
});

describe("dashboardDataSchema", () => {
  const valid = {
    summary: {
      totalIncome: "1000.00",
      totalExpensesPaid: "600.00",
      totalExpensesPending: "50.00",
      balance: "400.00",
      expenseRatio: 0.6,
    },
    previousPeriodIncomeChangePercent: 12.5,
    averageDailyExpense: "20.00",
    incompleteGoals: [
      {
        id: "goal-1",
        title: "Viagem",
        targetAmount: "5000.00",
        currentAmount: "3000.00",
        targetDate: "2026-07-01",
      },
    ],
    yearlyBreakdown: [{ month: 1, income: "1000.00", expensesPaid: "600.00" }],
  };

  it("parses a full valid payload", () => {
    expect(dashboardDataSchema.safeParse(valid).success).toBe(true);
  });

  it("allows a null previousPeriodIncomeChangePercent", () => {
    const result = dashboardDataSchema.safeParse({
      ...valid,
      previousPeriodIncomeChangePercent: null,
    });
    expect(result.success).toBe(true);
  });

  it("rejects a missing summary", () => {
    const { summary: _summary, ...rest } = valid;
    expect(dashboardDataSchema.safeParse(rest).success).toBe(false);
  });
});
