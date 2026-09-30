import { reportQuerySchema, reportSchema } from "./report";

describe("reportQuerySchema", () => {
  it("accepts no dates (the current month) or a valid range", () => {
    expect(reportQuerySchema.safeParse({}).success).toBe(true);
    expect(
      reportQuerySchema.safeParse({ dateFrom: "2026-09-01", dateTo: "2026-09-30" }).success,
    ).toBe(true);
    expect(
      reportQuerySchema.safeParse({ dateFrom: "2026-09-15", dateTo: "2026-09-15" }).success,
    ).toBe(true);
  });

  it("wants both dates or neither", () => {
    const result = reportQuerySchema.safeParse({ dateFrom: "2026-09-01" });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe("Informe as duas datas.");
    const onlyTo = reportQuerySchema.safeParse({ dateTo: "2026-09-30" });
    expect(onlyTo.error?.issues[0]?.message).toBe("Informe as duas datas.");
  });

  it("rejects an inverted range and dates that don't exist", () => {
    const inverted = reportQuerySchema.safeParse({ dateFrom: "2026-10-01", dateTo: "2026-09-01" });
    expect(inverted.error?.issues[0]?.message).toBe("A data final precisa ser depois da inicial.");
    expect(
      reportQuerySchema.safeParse({ dateFrom: "2026-02-31", dateTo: "2026-03-01" }).success,
    ).toBe(false);
  });
});

describe("reportSchema", () => {
  it("parses a report", () => {
    const report = {
      dateFrom: "2026-09-01",
      dateTo: "2026-09-30",
      summary: {
        totalIncome: "5000.00",
        totalExpensesPaid: "3600.00",
        balance: "1400.00",
        expenseRatio: 0.72,
      },
      monthly: [
        { month: "2026-09", income: "5000.00", expensesPaid: "3600.00", balance: "1400.00" },
      ],
      topExpenseCategories: [
        { categoryId: "c1", name: "Mercado", color: "#F59E0B", icon: "cart", total: "900.00" },
      ],
      topIncomeCategories: [],
      expensesByWeekday: [{ weekday: 0, total: "0.00" }],
      last12Months: [{ month: "2026-09", income: "5000.00", expensesPaid: "3600.00" }],
    };
    expect(reportSchema.safeParse(report).success).toBe(true);
    expect(
      reportSchema.safeParse({ ...report, expensesByWeekday: [{ weekday: 7, total: "0" }] })
        .success,
    ).toBe(false);
  });
});
