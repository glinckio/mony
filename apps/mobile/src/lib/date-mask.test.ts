import { formatDateDisplay, formatDateInputDigits, parseDateInputToISO } from "./date-mask";

describe("formatDateDisplay", () => {
  it("converts an ISO date to DD/MM/AAAA", () => {
    expect(formatDateDisplay("2026-01-15")).toBe("15/01/2026");
  });

  it("returns an empty string for a non-ISO or empty value", () => {
    expect(formatDateDisplay("")).toBe("");
    expect(formatDateDisplay("15/01/2026")).toBe("");
  });
});

describe("formatDateInputDigits", () => {
  it("inserts slashes progressively as digits are typed", () => {
    expect(formatDateInputDigits("1")).toBe("1");
    expect(formatDateInputDigits("15")).toBe("15");
    expect(formatDateInputDigits("1501")).toBe("15/01");
    expect(formatDateInputDigits("15012026")).toBe("15/01/2026");
  });

  it("ignores non-digit characters and caps at 8 digits", () => {
    expect(formatDateInputDigits("15/01/2026999")).toBe("15/01/2026");
  });
});

describe("parseDateInputToISO", () => {
  it("converts a complete DD/MM/AAAA input to ISO", () => {
    expect(parseDateInputToISO("15/01/2026")).toBe("2026-01-15");
    expect(parseDateInputToISO("15012026")).toBe("2026-01-15");
  });

  it("returns an empty string while the date is incomplete", () => {
    expect(parseDateInputToISO("15/01")).toBe("");
    expect(parseDateInputToISO("")).toBe("");
  });
});
