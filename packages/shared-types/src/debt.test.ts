import {
  MAX_DEBT_INSTALLMENTS,
  createDebtInputSchema,
  payInstallmentInputSchema,
  updateDebtInputSchema,
} from "./debt";

describe("createDebtInputSchema", () => {
  const base = {
    name: "Financiamento do carro",
    totalAmount: 12000,
    totalInstallments: 12,
    startDate: "2026-01-10",
  };

  it("accepts a minimal valid payload", () => {
    expect(createDebtInputSchema.safeParse(base).success).toBe(true);
  });

  it("rejects an empty name", () => {
    expect(createDebtInputSchema.safeParse({ ...base, name: "" }).success).toBe(false);
  });

  it("rejects a non-positive totalAmount", () => {
    expect(createDebtInputSchema.safeParse({ ...base, totalAmount: 0 }).success).toBe(false);
  });

  it("bounds totalInstallments to 1..MAX_DEBT_INSTALLMENTS, integers only", () => {
    expect(createDebtInputSchema.safeParse({ ...base, totalInstallments: 0 }).success).toBe(false);
    expect(createDebtInputSchema.safeParse({ ...base, totalInstallments: 1.5 }).success).toBe(
      false,
    );
    expect(
      createDebtInputSchema.safeParse({ ...base, totalInstallments: MAX_DEBT_INSTALLMENTS })
        .success,
    ).toBe(true);
    expect(
      createDebtInputSchema.safeParse({ ...base, totalInstallments: MAX_DEBT_INSTALLMENTS + 1 })
        .success,
    ).toBe(false);
  });

  it("rejects a total that can't give every installment at least one cent", () => {
    const result = createDebtInputSchema.safeParse({
      ...base,
      totalAmount: 0.05,
      totalInstallments: 6,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.path).toEqual(["totalAmount"]);
    }
    expect(
      createDebtInputSchema.safeParse({ ...base, totalAmount: 0.06, totalInstallments: 6 }).success,
    ).toBe(true);
  });

  it("rejects an endDate before startDate, accepts same day", () => {
    const result = createDebtInputSchema.safeParse({ ...base, endDate: "2026-01-09" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.path).toEqual(["endDate"]);
    }
    expect(createDebtInputSchema.safeParse({ ...base, endDate: "2026-01-10" }).success).toBe(true);
  });

  it("accepts an informational interestRate with up to 2 decimals", () => {
    expect(createDebtInputSchema.safeParse({ ...base, interestRate: 1.99 }).success).toBe(true);
    expect(createDebtInputSchema.safeParse({ ...base, interestRate: 1.999 }).success).toBe(false);
    expect(createDebtInputSchema.safeParse({ ...base, interestRate: -1 }).success).toBe(false);
  });
});

describe("updateDebtInputSchema", () => {
  it("accepts an empty payload (all fields optional)", () => {
    expect(updateDebtInputSchema.safeParse({}).success).toBe(true);
  });

  it("accepts null to clear optional fields", () => {
    expect(
      updateDebtInputSchema.safeParse({
        endDate: null,
        interestRate: null,
        categoryId: null,
        notes: null,
      }).success,
    ).toBe(true);
  });
});

describe("payInstallmentInputSchema", () => {
  it("requires a payment date and a positive amount", () => {
    expect(
      payInstallmentInputSchema.safeParse({ paymentDate: "2026-02-10", paidAmount: 1000 }).success,
    ).toBe(true);
    expect(payInstallmentInputSchema.safeParse({ paymentDate: "", paidAmount: 1000 }).success).toBe(
      false,
    );
    expect(
      payInstallmentInputSchema.safeParse({ paymentDate: "2026-02-10", paidAmount: 0 }).success,
    ).toBe(false);
  });
});

describe("date fields", () => {
  it("reject dates that don't exist on the calendar", () => {
    expect(
      payInstallmentInputSchema.safeParse({ paymentDate: "2026-02-31", paidAmount: 10 }).success,
    ).toBe(false);
    expect(
      payInstallmentInputSchema.safeParse({ paymentDate: "2028-02-29", paidAmount: 10 }).success,
    ).toBe(true);
    expect(
      createDebtInputSchema.safeParse({
        name: "X",
        totalAmount: 100,
        totalInstallments: 1,
        startDate: "2026-13-01",
      }).success,
    ).toBe(false);
    expect(updateDebtInputSchema.safeParse({ endDate: "2026-04-31" }).success).toBe(false);
  });
});
