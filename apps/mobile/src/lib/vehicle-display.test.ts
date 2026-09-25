import { FUEL_TYPE_LABELS, formatMileage, parseIntegerInput } from "./vehicle-display";

describe("vehicle-display", () => {
  it("formats mileage with pt-BR thousands", () => {
    expect(formatMileage(36200)).toBe("36.200 km");
    expect(formatMileage(0)).toBe("0 km");
  });

  it("parses digits only, empty as undefined", () => {
    expect(parseIntegerInput("36.200")).toBe(36200);
    expect(parseIntegerInput("")).toBeUndefined();
    expect(parseIntegerInput("abc")).toBeUndefined();
  });

  it("labels every fuel type (legacy list)", () => {
    expect(Object.keys(FUEL_TYPE_LABELS)).toHaveLength(8);
    expect(FUEL_TYPE_LABELS.CNG).toBe("GNV (Gás Natural)");
  });
});
