import {
  addDaysToDateString,
  addMonthsToDateString,
  daysBetweenInclusive,
  endOfMonthDateString,
  parseDateOnly,
  startOfMonthDateString,
  toDateOnlyString,
} from "./date.util";

describe("parseDateOnly", () => {
  it("parses a date-only string as UTC midnight, regardless of process timezone", () => {
    const date = parseDateOnly("2026-01-15");
    expect(date.toISOString()).toBe("2026-01-15T00:00:00.000Z");
  });
});

describe("toDateOnlyString", () => {
  it("reads UTC fields, not local ones", () => {
    expect(toDateOnlyString(new Date("2026-01-15T00:00:00.000Z"))).toBe("2026-01-15");
  });
});

describe("addMonthsToDateString", () => {
  it("adds whole calendar months", () => {
    expect(addMonthsToDateString("2026-02-01", 1)).toBe("2026-03-01");
    expect(addMonthsToDateString("2026-02-01", 2)).toBe("2026-04-01");
  });

  it("rolls over the year boundary", () => {
    expect(addMonthsToDateString("2026-11-15", 3)).toBe("2027-02-15");
  });

  it("returns the same date unchanged for 0 months", () => {
    expect(addMonthsToDateString("2026-01-15", 0)).toBe("2026-01-15");
  });
});

describe("addDaysToDateString", () => {
  it("adds days, rolling over month/year boundaries", () => {
    expect(addDaysToDateString("2026-01-30", 3)).toBe("2026-02-02");
    expect(addDaysToDateString("2026-12-30", 3)).toBe("2027-01-02");
  });

  it("subtracts days with a negative count", () => {
    expect(addDaysToDateString("2026-03-01", -1)).toBe("2026-02-28");
  });
});

describe("daysBetweenInclusive", () => {
  it("counts the same day as 1", () => {
    expect(daysBetweenInclusive("2026-01-15", "2026-01-15")).toBe(1);
  });

  it("counts a week as 7", () => {
    expect(daysBetweenInclusive("2026-01-01", "2026-01-07")).toBe(7);
  });
});

describe("startOfMonthDateString / endOfMonthDateString", () => {
  it("returns the first and last day of the month", () => {
    expect(startOfMonthDateString("2026-02-15")).toBe("2026-02-01");
    expect(endOfMonthDateString("2026-02-15")).toBe("2026-02-28");
  });

  it("handles a leap-year February", () => {
    expect(endOfMonthDateString("2028-02-10")).toBe("2028-02-29");
  });
});
