import { formatDecimalInput, parseDecimalInput, sanitizeDecimalInput } from "./decimal-input";

describe("sanitizeDecimalInput", () => {
  it("keeps digits and a single comma with at most two decimals", () => {
    expect(sanitizeDecimalInput("12")).toBe("12");
    expect(sanitizeDecimalInput("1,5")).toBe("1,5");
    expect(sanitizeDecimalInput("1,555")).toBe("1,55");
    expect(sanitizeDecimalInput("1,2,3")).toBe("1,23");
    expect(sanitizeDecimalInput("a1b,5")).toBe("1,5");
  });

  it("treats a typed dot as the decimal separator", () => {
    expect(sanitizeDecimalInput("1.5")).toBe("1,5");
  });
});

describe("parseDecimalInput", () => {
  it("parses pt-BR decimals, empty as undefined", () => {
    expect(parseDecimalInput("1,5")).toBe(1.5);
    expect(parseDecimalInput("3")).toBe(3);
    expect(parseDecimalInput("")).toBeUndefined();
  });
});

describe("formatDecimalInput", () => {
  it("renders a stored value for the input", () => {
    expect(formatDecimalInput("1.50")).toBe("1,5");
    expect(formatDecimalInput(2)).toBe("2");
    expect(formatDecimalInput(null)).toBe("");
  });
});
