import { render, screen } from "@testing-library/react-native";

import { ReportHero } from "./ReportHero";

describe("ReportHero", () => {
  it("shows the period's balance, income in, paid expenses out, and the ratio", async () => {
    await render(
      <ReportHero
        periodLabel="01/09 – 30/09/2026 · Pessoal"
        summary={{
          totalIncome: "1000.00",
          totalExpensesPaid: "1250.00",
          balance: "-250.00",
          expenseRatio: 1.25,
        }}
      />,
    );

    expect(screen.getByText("01/09 – 30/09/2026 · Pessoal")).toBeTruthy();
    expect(screen.getByLabelText("Saldo do período: menos 250 reais")).toBeTruthy();
    expect(screen.getByText("+ 1.000,00")).toBeTruthy();
    expect(screen.getByText("− 1.250,00")).toBeTruthy();
    expect(screen.getByLabelText("Receitas: 1000 reais")).toBeTruthy();
    expect(screen.getByLabelText("Despesas pagas: 1250 reais")).toBeTruthy();
    // Above 90%: legacy's red alert, the real figure past 100% on the label.
    expect(screen.getByText("125,0%")).toBeTruthy();
    expect(
      screen.getByLabelText(
        "Despesas em relação às receitas: 125,0%. Alerta! Suas despesas estão superando suas receitas.",
      ),
    ).toBeTruthy();
  });
});
