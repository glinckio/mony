import { Prisma } from "@prisma/client";

import {
  computeDebtTotals,
  coversOneCentEach,
  installmentDescription,
  splitAmount,
} from "./debt-sync";

const d = (value: string) => new Prisma.Decimal(value);

describe("splitAmount", () => {
  it("splits evenly when the total divides to the cent", () => {
    expect(splitAmount(d("12000"), 12).map(String)).toEqual(Array(12).fill("1000"));
  });

  it("puts the rounding remainder on the last installment so the sum is exact", () => {
    // Legacy: 2383.29 / 5 = 476.658 stored as 476.66 x5 = 2383.30 (one cent too many).
    const parts = splitAmount(d("2383.29"), 5);
    expect(parts.map((part) => part.toFixed(2))).toEqual([
      "476.65",
      "476.65",
      "476.65",
      "476.65",
      "476.69",
    ]);
    expect(parts.reduce((sum, part) => sum.plus(part), d("0")).toFixed(2)).toBe("2383.29");
  });

  it("handles a single installment", () => {
    expect(splitAmount(d("99.99"), 1).map((part) => part.toFixed(2))).toEqual(["99.99"]);
  });

  it("handles the one-cent-each boundary", () => {
    expect(splitAmount(d("0.03"), 3).map((part) => part.toFixed(2))).toEqual([
      "0.01",
      "0.01",
      "0.01",
    ]);
  });
});

describe("coversOneCentEach", () => {
  it("requires at least 0.01 per installment", () => {
    expect(coversOneCentEach(d("0.05"), 5)).toBe(true);
    expect(coversOneCentEach(d("0.04"), 5)).toBe(false);
  });
});

describe("installmentDescription", () => {
  it("renders the pt-BR legacy format", () => {
    expect(installmentDescription(3, 12, "Financiamento do carro")).toBe(
      "Parcela 3/12 - Financiamento do carro",
    );
  });
});

describe("computeDebtTotals", () => {
  const installment = (status: "PAID" | "PENDING", amount: string, dueDate: string) => ({
    status,
    amount: d(amount),
    dueDate: new Date(`${dueDate}T00:00:00.000Z`),
  });

  it("is ACTIVE with nothing paid and nothing past due", () => {
    const totals = computeDebtTotals(
      [installment("PENDING", "100", "2026-02-10"), installment("PENDING", "100", "2026-03-10")],
      "2026-02-10",
    );
    expect(totals).toEqual({ paidAmount: d("0"), paidInstallments: 0, status: "ACTIVE" });
  });

  it("is OVERDUE when a pending installment's due date is strictly before today", () => {
    const totals = computeDebtTotals(
      [installment("PAID", "100", "2026-01-10"), installment("PENDING", "100", "2026-02-09")],
      "2026-02-10",
    );
    expect(totals.status).toBe("OVERDUE");
    expect(totals.paidInstallments).toBe(1);
    expect(totals.paidAmount.toFixed(2)).toBe("100.00");
  });

  it("isn't OVERDUE for a pending installment due today", () => {
    expect(computeDebtTotals([installment("PENDING", "100", "2026-02-10")], "2026-02-10").status).toBe(
      "ACTIVE",
    );
  });

  it("is PAID_OFF when every installment is paid, even with past due dates", () => {
    const totals = computeDebtTotals(
      [installment("PAID", "476.65", "2020-01-10"), installment("PAID", "476.69", "2020-02-10")],
      "2026-02-10",
    );
    expect(totals).toEqual({ paidAmount: d("953.34"), paidInstallments: 2, status: "PAID_OFF" });
  });
});
