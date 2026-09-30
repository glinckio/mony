import type { Report } from "@mony/shared-types";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react-native";

import { apiFetch } from "../../lib/api-client";
import { currentMonthRange } from "../../lib/report-display";
import { useWorkspaceStore } from "../../lib/workspace-store";

import { ReportsScreen } from "./ReportsScreen";

jest.mock("../../lib/api-client", () => ({ apiFetch: jest.fn() }));

const mockedApiFetch = apiFetch as jest.Mock;
const Stack = createNativeStackNavigator();

const zeroWeek = Array.from({ length: 7 }, (_, weekday) => ({ weekday, total: "0.00" }));
const trend = Array.from({ length: 12 }, (_, index) => ({
  month: `2026-${String(index + 1).padStart(2, "0")}`,
  income: index === 8 ? "5200.00" : "0.00",
  expensesPaid: index === 8 ? "3719.31" : "0.00",
}));

const REPORT: Report = {
  dateFrom: "2026-07-01",
  dateTo: "2026-09-30",
  summary: {
    totalIncome: "15400.00",
    totalExpensesPaid: "11086.35",
    balance: "4313.65",
    expenseRatio: 11086.35 / 15400,
  },
  monthly: [
    { month: "2026-07", income: "5000.00", expensesPaid: "3600.00", balance: "1400.00" },
    { month: "2026-08", income: "5200.00", expensesPaid: "3767.04", balance: "1432.96" },
    { month: "2026-09", income: "5200.00", expensesPaid: "3719.31", balance: "1480.69" },
  ],
  topExpenseCategories: [
    { categoryId: "c1", name: "Moradia", color: "#5550F0", icon: "home", total: "5400.00" },
    { categoryId: "c2", name: "Mercado", color: "#F59E0B", icon: "cart", total: "2150.40" },
  ],
  topIncomeCategories: [
    { categoryId: "c9", name: "Salário", color: "#0C7F3F", icon: "cash", total: "15400.00" },
  ],
  expensesByWeekday: zeroWeek.map((day) =>
    day.weekday === 6 ? { weekday: 6, total: "1830.25" } : day,
  ),
  last12Months: trend,
};

const EMPTY: Report = {
  ...REPORT,
  summary: { totalIncome: "0.00", totalExpensesPaid: "0.00", balance: "0.00", expenseRatio: 0 },
  monthly: [],
  topExpenseCategories: [],
  topIncomeCategories: [],
  expensesByWeekday: zeroWeek,
};

function renderScreen() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <NavigationContainer>
        <Stack.Navigator screenOptions={{ headerShown: false, animation: "none" }}>
          <Stack.Screen name="Reports" component={ReportsScreen} />
        </Stack.Navigator>
      </NavigationContainer>
    </QueryClientProvider>,
  );
}

const flush = () => new Promise<void>((resolve) => setTimeout(resolve, 50));
const isoOf = (display: string) => display.split("/").reverse().join("-");

describe("ReportsScreen", () => {
  beforeEach(() => mockedApiFetch.mockReset());
  afterEach(() => useWorkspaceStore.setState({ activeWorkspace: null }));

  it("asks for the current month and shows legacy's sections", async () => {
    mockedApiFetch.mockResolvedValue(REPORT);
    const view = await renderScreen();
    const month = currentMonthRange();

    await waitFor(() => {
      expect(screen.getByTestId("reports-summary")).toBeTruthy();
    });
    expect(mockedApiFetch).toHaveBeenCalledWith(
      `/reports?dateFrom=${isoOf(month.from)}&dateTo=${isoOf(month.to)}`,
    );
    expect(screen.getByDisplayValue(month.from)).toBeTruthy();
    // Legacy's summary: 72,0% with its "Atenção!" message.
    const summary = within(screen.getByTestId("reports-summary"));
    expect(summary.getByText("72,0%")).toBeTruthy();
    expect(summary.getByText(/^Atenção! Suas despesas/)).toBeTruthy();
    for (const title of [
      "Receitas × despesas por mês",
      "Evolução anual",
      "Despesas por categoria",
      "Receitas por categoria",
      "Despesas por dia da semana",
      "Resumo mensal",
    ]) {
      expect(screen.getByText(title)).toBeTruthy();
    }
    expect(screen.getByText("Moradia")).toBeTruthy();
    expect(screen.getAllByText("set/2026").length).toBeGreaterThan(0);
    // The busiest weekday is selected: Saturday.
    expect(screen.getByText("Sábado")).toBeTruthy();
    view.unmount();
    await flush();
  });

  it("reloads for a new range, and refuses an inverted one before asking", async () => {
    mockedApiFetch.mockResolvedValue(REPORT);
    const view = await renderScreen();
    await waitFor(() => {
      expect(screen.getByTestId("reports-summary")).toBeTruthy();
    });

    await fireEvent.changeText(screen.getByTestId("reports-date-from"), "01072026");
    await fireEvent.changeText(screen.getByTestId("reports-date-to"), "30092026");
    await waitFor(() => {
      expect(mockedApiFetch).toHaveBeenLastCalledWith(
        "/reports?dateFrom=2026-07-01&dateTo=2026-09-30",
      );
    });

    const calls = mockedApiFetch.mock.calls.length;
    await fireEvent.changeText(screen.getByTestId("reports-date-to"), "01062026");
    expect(screen.getByText("A data final precisa ser depois da inicial.")).toBeTruthy();
    await fireEvent.changeText(screen.getByTestId("reports-date-from"), "31022026");
    expect(screen.getByText("Data inválida.")).toBeTruthy();
    await flush();
    expect(mockedApiFetch.mock.calls.length).toBe(calls);
    view.unmount();
    await flush();
  });

  it("shows one empty state for an empty range, keeping the 12 months", async () => {
    mockedApiFetch.mockResolvedValue(EMPTY);
    const view = await renderScreen();

    await waitFor(() => {
      expect(screen.getByTestId("reports-empty")).toBeTruthy();
    });
    expect(screen.queryByTestId("reports-summary")).toBeNull();
    expect(screen.getByText("Evolução anual")).toBeTruthy();
    view.unmount();
    await flush();
  });

  it("shows pt-BR copy when the report can't load", async () => {
    mockedApiFetch.mockRejectedValue(new Error("Internal server error."));
    const view = await renderScreen();

    await waitFor(() => {
      expect(screen.getByText("Não consegui falar com o Mony agora.")).toBeTruthy();
    });
    expect(screen.queryByText("Internal server error.")).toBeNull();
    view.unmount();
    await flush();
  });

  it("keeps the report on screen while a date is being typed", async () => {
    mockedApiFetch.mockResolvedValue(REPORT);
    const view = await renderScreen();
    await waitFor(() => {
      expect(screen.getByTestId("reports-summary")).toBeTruthy();
    });

    // Half a date: nothing to ask yet, but the last report stays (dimmed).
    await fireEvent.changeText(screen.getByTestId("reports-date-from"), "01/0");
    expect(screen.getByTestId("reports-summary")).toBeTruthy();
    // The hero names the report's own range, not the half-typed text.
    expect(screen.getByText(/^01\/07 – 30\/09\/2026/)).toBeTruthy();
    view.unmount();
    await flush();
  });

  it("selects the new range's busiest weekday, and says Total under 5 categories", async () => {
    const tuesday = {
      ...REPORT,
      dateFrom: "2026-06-01",
      dateTo: "2026-06-30",
      expensesByWeekday: zeroWeek.map((day) =>
        day.weekday === 2 ? { weekday: 2, total: "900.00" } : day,
      ),
    };
    mockedApiFetch.mockImplementation(async (path: string) =>
      path.includes("2026-06-01") ? tuesday : REPORT,
    );
    const view = await renderScreen();
    await waitFor(() => {
      expect(screen.getByText("Sábado")).toBeTruthy();
    });
    // Two categories only: the donut's center is the plain total.
    expect(screen.getAllByText("Total").length).toBeGreaterThan(0);

    await fireEvent.changeText(screen.getByTestId("reports-date-from"), "01062026");
    await fireEvent.changeText(screen.getByTestId("reports-date-to"), "30062026");
    await waitFor(() => {
      expect(screen.getByText("Terça-feira")).toBeTruthy();
    });
    expect(screen.queryByText("Sábado")).toBeNull();
    view.unmount();
    await flush();
  });

  it("charts the last 3 months with their balance, and lists every month below", async () => {
    const earlier = [
      { month: "2026-05", income: "4000.00", expensesPaid: "4400.00", balance: "-400.00" },
      { month: "2026-06", income: "4100.00", expensesPaid: "2000.00", balance: "2100.00" },
    ];
    mockedApiFetch.mockResolvedValue({ ...REPORT, monthly: [...earlier, ...REPORT.monthly] });
    const view = await renderScreen();
    await waitFor(() => {
      expect(screen.getByTestId("reports-months")).toBeTruthy();
    });

    const chart = within(screen.getByTestId("reports-months"));
    expect(chart.getAllByRole("button")).toHaveLength(3);
    expect(chart.queryByLabelText(/^maio de 2026/)).toBeNull();
    expect(chart.queryByLabelText(/^junho de 2026/)).toBeNull();
    for (const [label, balance] of [
      ["jul/2026", "R$ 1.400,00"],
      ["ago/2026", "R$ 1.432,96"],
      ["set/2026", "R$ 1.480,69"],
    ] as const) {
      expect(chart.getAllByText(label).length).toBeGreaterThan(0);
      expect(chart.getByText(balance)).toBeTruthy();
    }

    const table = within(screen.getByTestId("reports-monthly"));
    for (const label of ["mai/2026", "jun/2026", "jul/2026", "ago/2026", "set/2026"]) {
      expect(table.getByText(label)).toBeTruthy();
    }
    // May spent 110% of what came in; its balance is negative.
    expect(table.getByText("Saldo − R$ 400,00")).toBeTruthy();
    expect(table.getByText("110,0%")).toBeTruthy();
    view.unmount();
    await flush();
  });

  it("gives each empty section its own message", async () => {
    const quietTrend = trend.map((month) => ({ ...month, income: "0.00", expensesPaid: "0.00" }));
    const incomeOnly: Report = {
      ...EMPTY,
      summary: {
        totalIncome: "900.00",
        totalExpensesPaid: "0.00",
        balance: "900.00",
        expenseRatio: 0,
      },
      monthly: [{ month: "2024-03", income: "900.00", expensesPaid: "0.00", balance: "900.00" }],
      topIncomeCategories: REPORT.topIncomeCategories,
      last12Months: quietTrend,
    };
    const expensesOnly: Report = {
      ...REPORT,
      dateFrom: "2024-04-01",
      dateTo: "2024-04-30",
      topIncomeCategories: [],
    };
    mockedApiFetch.mockImplementation(async (path: string) =>
      path.includes("2024-04-01") ? expensesOnly : incomeOnly,
    );
    const view = await renderScreen();
    await waitFor(() => {
      expect(screen.getByTestId("reports-summary")).toBeTruthy();
    });

    // Income only: no paid expense for the categories nor the weekdays, and
    // nothing in the last 12 months.
    expect(screen.getAllByText("Nenhuma despesa paga no período.")).toHaveLength(2);
    expect(screen.getByText("Nada lançado nos últimos 12 meses.")).toBeTruthy();
    expect(screen.getByText("Salário")).toBeTruthy();
    expect(screen.queryByText("Nenhuma receita no período.")).toBeNull();
    expect(screen.queryByTestId("reports-empty")).toBeNull();

    await fireEvent.changeText(screen.getByTestId("reports-date-from"), "01042024");
    await fireEvent.changeText(screen.getByTestId("reports-date-to"), "30042024");
    await waitFor(() => {
      expect(screen.getByText("Nenhuma receita no período.")).toBeTruthy();
    });
    expect(screen.queryByText("Nenhuma despesa paga no período.")).toBeNull();
    view.unmount();
    await flush();
  });

  it("never shows one notebook's report under the other's name", async () => {
    useWorkspaceStore.setState({ activeWorkspace: "PERSONAL" });
    let answerBusiness: (report: Report) => void = () => undefined;
    mockedApiFetch.mockResolvedValueOnce(REPORT).mockImplementationOnce(
      () =>
        new Promise<Report>((resolve) => {
          answerBusiness = resolve;
        }),
    );
    const view = await renderScreen();
    await waitFor(() => {
      expect(screen.getByText(/· Pessoal$/)).toBeTruthy();
    });

    await act(async () => {
      useWorkspaceStore.getState().setActiveWorkspace("BUSINESS");
    });
    // The personal figures leave at once; skeletons until Empresa's arrive.
    await waitFor(() => {
      expect(mockedApiFetch).toHaveBeenCalledTimes(2);
    });
    expect(screen.queryByTestId("reports-summary")).toBeNull();
    expect(screen.queryByText("Moradia")).toBeNull();

    await act(async () => {
      answerBusiness({
        ...REPORT,
        topExpenseCategories: [
          {
            categoryId: "b1",
            name: "Fornecedores",
            color: "#5550F0",
            icon: "cube",
            total: "80.00",
          },
        ],
      });
    });
    await waitFor(() => {
      expect(screen.getByText(/· Empresa$/)).toBeTruthy();
    });
    expect(screen.getByText("Fornecedores")).toBeTruthy();
    view.unmount();
    await flush();
  });

  it("tries again from the error state", async () => {
    mockedApiFetch
      .mockRejectedValueOnce(new Error("Internal server error."))
      .mockResolvedValue(REPORT);
    const view = await renderScreen();
    await waitFor(() => {
      expect(screen.getByText("Tentar de novo")).toBeTruthy();
    });

    await fireEvent.press(screen.getByText("Tentar de novo"));

    await waitFor(() => {
      expect(screen.getByTestId("reports-summary")).toBeTruthy();
    });
    expect(mockedApiFetch).toHaveBeenCalledTimes(2);
    view.unmount();
    await flush();
  });
});
