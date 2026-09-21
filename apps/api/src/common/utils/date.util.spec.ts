import { addMonthsToDateString, parseDateOnly, toDateOnlyString } from "./date.util";

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
