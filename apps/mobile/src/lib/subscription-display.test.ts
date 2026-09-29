import type { Plan, Subscription } from "@mony/shared-types";

import {
  annualComparison,
  orderPlans,
  priceCopy,
  subscriptionCopy,
  trialChargeDate,
  trialProgress,
} from "./subscription-display";

const PLANS: Plan[] = [
  { plan: "MONTHLY", amount: "9.90", currency: "BRL", interval: "month", trialDays: 7 },
  { plan: "ANNUAL", amount: "65.34", currency: "BRL", interval: "year", trialDays: 7 },
];

function subscription(overrides: Partial<Subscription> = {}): Subscription {
  return {
    plan: "MONTHLY",
    status: "ACTIVE",
    currentPeriodEnd: "2026-10-28T12:00:00.000Z",
    trialEndsAt: null,
    cancelScheduled: false,
    updatedAt: "2026-09-28T12:00:00.000Z",
    ...overrides,
  };
}

// Noon local time, so date math never crosses midnight.
const NOW = new Date(2026, 8, 29, 12, 0);

describe("subscriptionCopy", () => {
  it("offers the trial when there's no subscription, with the first charge's day", () => {
    expect(subscriptionCopy(null, NOW)).toEqual({
      status: "Sem assinatura",
      chip: "7 dias grátis",
      icon: "gift-outline",
      headline: "Experimente o Mony",
      message: "Nada é cobrado até 06/10.",
      alert: false,
    });
  });

  it("uses legacy's status names, with the plan and the relevant date", () => {
    expect(subscriptionCopy(subscription())).toMatchObject({
      status: "Ativa",
      headline: "Plano Mensal",
      message: "Renova em 28/10/2026.",
      alert: false,
    });
    expect(
      subscriptionCopy(
        subscription({
          status: "TRIALING",
          plan: "ANNUAL",
          trialEndsAt: "2026-10-05T12:00:00.000Z",
        }),
      ),
    ).toMatchObject({
      status: "Em teste",
      headline: "Plano Anual",
      message: "O teste grátis vai até 05/10/2026.",
    });
    expect(subscriptionCopy(subscription({ status: "CANCELED" }))).toMatchObject({
      status: "Cancelada",
      headline: "Sua assinatura terminou",
    });
  });

  it("turns a pending payment into an alert, even with a cancellation scheduled", () => {
    for (const cancelScheduled of [false, true]) {
      expect(subscriptionCopy(subscription({ status: "PAST_DUE", cancelScheduled }))).toMatchObject(
        { status: "Pagamento pendente", alert: true },
      );
    }
  });

  it("shows Stripe's instants as the phone's local day", () => {
    // 23:30 local on 05/10 is already the 6th in UTC: still the 5th here.
    const lateEvening = new Date(2026, 9, 5, 23, 30).toISOString();
    expect(subscriptionCopy(subscription({ currentPeriodEnd: lateEvening })).message).toBe(
      "Renova em 05/10/2026.",
    );
  });

  it("shows a scheduled cancellation with the end date, but not once canceled", () => {
    expect(subscriptionCopy(subscription({ cancelScheduled: true }))).toMatchObject({
      status: "Cancelamento agendado",
      message: "Continua ativa até 28/10/2026.",
    });
    expect(
      subscriptionCopy(subscription({ status: "CANCELED", cancelScheduled: true })).status,
    ).toBe("Cancelada");
  });
});

describe("trial", () => {
  it("charges seven days from now; cancelling the day before costs nothing", () => {
    expect(trialChargeDate(NOW)).toEqual({ short: "06/10", cancelBy: "05/10" });
  });

  it("counts the start day as day 1, so the bar is never empty", () => {
    const endsIn = (days: number) =>
      subscription({
        status: "TRIALING",
        trialEndsAt: new Date(NOW.getTime() + days * 24 * 60 * 60 * 1000).toISOString(),
      });
    expect(trialProgress(endsIn(7), NOW)).toMatchObject({ day: 1, daysLeft: 7 });
    expect(trialProgress(endsIn(2.5), NOW)).toMatchObject({ day: 5, daysLeft: 3 });
    expect(trialProgress(endsIn(0), NOW)).toMatchObject({ day: 7, daysLeft: 0, percent: 100 });
    expect(trialProgress(subscription(), NOW)).toBeNull();
  });
});

describe("plans", () => {
  it("formats each plan's price per interval", () => {
    expect(priceCopy(PLANS[0]!)).toMatch(/R\$\s9,90\/mês/);
    expect(priceCopy(PLANS[1]!)).toMatch(/R\$\s65,34\/ano/);
  });

  it("lists the annual plan first", () => {
    expect(orderPlans(PLANS).map((plan) => plan.plan)).toEqual(["ANNUAL", "MONTHLY"]);
  });

  it("compares the annual plan to twelve monthly payments (legacy: 45% off)", () => {
    const comparison = annualComparison(PLANS)!;
    expect(comparison.monthlyEquivalent).toMatch(/R\$\s5,45\/mês/);
    expect(comparison.saving).toBe("Economize 45%");
    expect(comparison.spokenSaving).toBe("economize 53 reais e 46 centavos por ano, 45%");
  });

  it("offers no comparison when the annual plan doesn't save anything", () => {
    expect(annualComparison([PLANS[0]!, { ...PLANS[1]!, amount: "200.00" }])).toBeNull();
  });
});
