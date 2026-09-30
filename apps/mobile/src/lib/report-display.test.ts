import type { Report, ReportCategory, ReportMonth } from "@mony/shared-types";

import {
  categoryShares,
  currentMonthRange,
  isEmptyReport,
  lastThreeMonths,
  monthLabel,
  monthRatio,
  percentLabel,
  rangeLabel,
  summaryRatio,
} from "./report-display";

const month = (key: string, income: string, expensesPaid: string): ReportMonth => ({
  month: key,
  income,
  expensesPaid,
  balance: (Number(income) - Number(expensesPaid)).toFixed(2),
});

describe("labels", () => {
  it("formats months and percentages the pt-BR way (legacy: one decimal)", () => {
    expect(monthLabel("2026-09")).toBe("set/2026");
    expect(monthLabel("2027-01")).toBe("jan/2027");
    expect(percentLabel(0.7244)).toBe("72,4%");
    expect(percentLabel(0)).toBe("0,0%");
  });

  it("pre-fills the phone's current month", () => {
    expect(currentMonthRange(new Date(2026, 8, 29, 23, 30))).toEqual({
      from: "01/09/2026",
      to: "30/09/2026",
    });
    expect(currentMonthRange(new Date(2028, 1, 10))).toEqual({
      from: "01/02/2028",
      to: "29/02/2028",
    });
  });
});

describe("rangeLabel", () => {
  it("shows the year once, or both when they differ", () => {
    expect(rangeLabel("2026-07-01", "2026-09-30")).toBe("01/07 – 30/09/2026");
    expect(rangeLabel("2025-12-01", "2026-01-31")).toBe("01/12/2025 – 31/01/2026");
  });
});

describe("legacy's thresholds", () => {
  it("colors the period summary at 70% and 90%, with legacy's messages", () => {
    expect(summaryRatio(0.7)).toEqual({
      tone: "success",
      message: "Sua situação financeira está controlada!",
    });
    expect(summaryRatio(0.9).tone).toBe("warning");
    expect(summaryRatio(0.9).message).toMatch(/^Atenção!/);
    expect(summaryRatio(0.91)).toEqual({
      tone: "danger",
      message: "Alerta! Suas despesas estão superando suas receitas.",
    });
  });

  it("colors the monthly table at 80% and 100%", () => {
    expect(monthRatio(month("2026-09", "1000.00", "800.00"))).toEqual({
      ratio: 0.8,
      tone: "success",
    });
    expect(monthRatio(month("2026-09", "1000.00", "1000.00")).tone).toBe("warning");
    expect(monthRatio(month("2026-09", "1000.00", "1000.01")).tone).toBe("danger");
    // No income: nothing to compare against.
    expect(monthRatio(month("2026-09", "0.00", "50.00"))).toEqual({ ratio: 0, tone: "success" });
  });
});

describe("sections", () => {
  it("charts only the last 3 months of the range", () => {
    const monthly = ["2026-05", "2026-06", "2026-07", "2026-08", "2026-09"].map((key) =>
      month(key, "1.00", "1.00"),
    );
    expect(lastThreeMonths(monthly).map((m) => m.month)).toEqual(["2026-07", "2026-08", "2026-09"]);
  });

  it("shares each category of the top 5 shown", () => {
    const categories: ReportCategory[] = [
      { categoryId: "a", name: "Aluguel", color: "#111111", icon: "home", total: "750.00" },
      { categoryId: "b", name: "Mercado", color: "#222222", icon: "cart", total: "250.00" },
    ];
    expect(categoryShares(categories).map((c) => c.share)).toEqual([0.75, 0.25]);
  });

  it("tells an empty range apart", () => {
    const empty = {
      summary: { totalIncome: "0.00", totalExpensesPaid: "0.00", balance: "0.00", expenseRatio: 0 },
      monthly: [],
    } as unknown as Report;
    expect(isEmptyReport(empty)).toBe(true);
    expect(isEmptyReport({ ...empty, monthly: [month("2026-09", "0.00", "0.00")] })).toBe(false);
  });
});
