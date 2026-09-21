import { Prisma } from "@prisma/client";

import { decimalToString } from "./money.util";

describe("decimalToString", () => {
  it("formats a Decimal to 2 decimal places", () => {
    expect(decimalToString(new Prisma.Decimal("1500.5"))).toBe("1500.50");
  });

  it("defaults to zero for null/undefined", () => {
    expect(decimalToString(null)).toBe("0.00");
    expect(decimalToString(undefined)).toBe("0.00");
  });
});
