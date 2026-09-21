import { formatAmountDisplay, parseAmountInput } from "./currency-mask";

describe("formatAmountDisplay", () => {
  it("formats a number as pt-BR currency", () => {
    expect(formatAmountDisplay(1500.5)).toBe("R$ 1.500,50");
  });

  it("returns an empty string for undefined", () => {
    expect(formatAmountDisplay(undefined)).toBe("");
  });
});

describe("parseAmountInput", () => {
  it("treats typed digits as cents", () => {
    expect(parseAmountInput("150050")).toBe(1500.5);
  });

  it("strips non-digit characters (e.g. the formatted display re-typed)", () => {
    expect(parseAmountInput("R$ 1.500,50")).toBe(1500.5);
  });

  it("returns undefined for no digits", () => {
    expect(parseAmountInput("")).toBeUndefined();
    expect(parseAmountInput("R$ ")).toBeUndefined();
  });
});
