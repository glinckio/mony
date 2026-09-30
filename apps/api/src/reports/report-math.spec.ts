import { BadRequestException } from "@nestjs/common";

import {
  expenseRatio,
  fillMonths,
  fillWeekdays,
  lastTwelveMonths,
  resolveRange,
} from "./report-math";

describe("resolveRange", () => {
  it("defaults to the month today is in", () => {
    expect(resolveRange({}, "2026-09-29")).toEqual(["2026-09-01", "2026-09-30"]);
    expect(resolveRange({}, "2024-02-10")).toEqual(["2024-02-01", "2024-02-29"]);
  });

  it("takes a given range as is, a single day included", () => {
    expect(resolveRange({ dateFrom: "2026-07-01", dateTo: "2026-09-30" }, "2026-09-29")).toEqual([
      "2026-07-01",
      "2026-09-30",
    ]);
    expect(resolveRange({ dateFrom: "2026-09-15", dateTo: "2026-09-15" }, "2026-09-29")).toEqual([
      "2026-09-15",
      "2026-09-15",
    ]);
  });

  it("wants both dates, in order", () => {
    expect(() => resolveRange({ dateFrom: "2026-09-01" }, "2026-09-29")).toThrow(
      BadRequestException,
    );
    expect(() => resolveRange({ dateTo: "2026-09-01" }, "2026-09-29")).toThrow(
      "dateFrom and dateTo must be given together.",
    );
    expect(() =>
      resolveRange({ dateFrom: "2026-10-01", dateTo: "2026-09-01" }, "2026-09-29"),
    ).toThrow("dateFrom must not be after dateTo.");
  });
});

describe("lastTwelveMonths", () => {
  it("covers the 11 months before today's and that one, whole months", () => {
    const window = lastTwelveMonths("2026-09-29");
    expect(window.dateFrom).toBe("2025-10-01");
    expect(window.dateTo).toBe("2026-09-30");
    expect(window.months).toHaveLength(12);
    expect(window.months[0]).toBe("2025-10");
    expect(window.months[11]).toBe("2026-09");
  });

  it("doesn't drift on the 31st", () => {
    const window = lastTwelveMonths("2026-03-31");
    expect(window.months[0]).toBe("2025-04");
    expect(window.months).toContain("2026-02");
    expect(new Set(window.months).size).toBe(12);
  });
});

describe("fillers", () => {
  it("gives all seven weekdays, Sunday first", () => {
    expect(fillWeekdays([{ weekday: 6, total: "30.00" }])).toEqual([
      { weekday: 0, total: "0.00" },
      { weekday: 1, total: "0.00" },
      { weekday: 2, total: "0.00" },
      { weekday: 3, total: "0.00" },
      { weekday: 4, total: "0.00" },
      { weekday: 5, total: "0.00" },
      { weekday: 6, total: "30.00" },
    ]);
  });

  it("fills missing months in order", () => {
    const empty = (month: string) => ({ month, income: "0.00" });
    expect(
      fillMonths(["2026-07", "2026-08"], [{ month: "2026-08", income: "5.00" }], empty),
    ).toEqual([
      { month: "2026-07", income: "0.00" },
      { month: "2026-08", income: "5.00" },
    ]);
  });

  it("puts expenses against income, 0 without income", () => {
    expect(expenseRatio(1000, 720)).toBeCloseTo(0.72);
    expect(expenseRatio(0, 300)).toBe(0);
  });
});
