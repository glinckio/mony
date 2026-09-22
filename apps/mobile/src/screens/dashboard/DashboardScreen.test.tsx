import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";

import { apiFetch } from "../../lib/api-client";

import { DashboardScreen } from "./DashboardScreen";

// react-native-gifted-charts schedules Animated timers (label-appear,
// bar-grow) that outlive the test's render/unmount cycle and crash the
// Jest worker with "environment torn down" once they fire — same class
// of issue as TanStack Query's global listeners (see tech.md). The
// chart's own rendering isn't under test here, so replace it with an
// inert stand-in. `mock`-prefixed names are the one exception jest's
// module-factory hoisting allows for out-of-scope references.
jest.mock("react-native-gifted-charts", () => {
  const mockReactNative = jest.requireActual("react-native");
  return {
    BarChart: (props: { testID?: string }) => <mockReactNative.View testID={props.testID} />,
  };
});

jest.mock("../../lib/api-client", () => ({
  apiFetch: jest.fn(),
  logout: jest.fn(),
  ApiError: class ApiError extends Error {
    statusCode: number;
    body: unknown;
    constructor(statusCode: number, body: unknown) {
      super("api error");
      this.statusCode = statusCode;
      this.body = body;
    }
  },
}));

const mockedApiFetch = apiFetch as jest.Mock;

const Stack = createNativeStackNavigator();

function renderScreen() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, refetchOnWindowFocus: false, gcTime: 0 },
    },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <NavigationContainer>
        <Stack.Navigator screenOptions={{ headerShown: false, animation: "none" }}>
          <Stack.Screen name="Home" component={DashboardScreen} />
          <Stack.Screen name="Goals" component={() => null} />
          <Stack.Screen name="Profile" component={() => null} />
        </Stack.Navigator>
      </NavigationContainer>
    </QueryClientProvider>,
  );
}

const buildDashboardData = (overrides: Partial<Record<string, unknown>> = {}) => ({
  summary: {
    totalIncome: "1000.00",
    totalExpensesPaid: "600.00",
    totalExpensesPending: "50.00",
    balance: "400.00",
    expenseRatio: 0.6,
  },
  previousPeriodIncomeChangePercent: 12.5,
  averageDailyExpense: "20.00",
  incompleteGoals: [
    {
      id: "goal-1",
      title: "Viagem",
      targetAmount: "5000.00",
      currentAmount: "3000.00",
      targetDate: "2026-07-01",
    },
  ],
  yearlyBreakdown: Array.from({ length: 12 }, (_, i) => ({
    month: i + 1,
    income: "0.00",
    expensesPaid: "0.00",
  })),
  ...overrides,
});

// See the matching note in LoginScreen.test.tsx.
const flush = () => new Promise<void>((resolve) => setTimeout(resolve, 50));

describe("DashboardScreen", () => {
  it("renders the summary figures once the dashboard loads", async () => {
    mockedApiFetch.mockResolvedValue(buildDashboardData());

    const view = await renderScreen();

    await waitFor(() => {
      expect(screen.getByTestId("dashboard-summary-card")).toBeTruthy();
    });

    expect(screen.getByText("R$ 400,00")).toBeTruthy();
    expect(screen.getByText("R$ 1.000,00")).toBeTruthy();
    expect(screen.getByText("R$ 600,00")).toBeTruthy();

    view.unmount();
    await flush();
  });

  it("shows the comparison badge with the previous-period change", async () => {
    mockedApiFetch.mockResolvedValue(buildDashboardData());

    const view = await renderScreen();

    await waitFor(() => {
      expect(screen.getByTestId("dashboard-comparison-badge")).toBeTruthy();
    });
    expect(screen.getByText(/12\.5% de receita/)).toBeTruthy();

    view.unmount();
    await flush();
  });

  it("hides the comparison badge when the previous period had 0 income", async () => {
    mockedApiFetch.mockResolvedValue(
      buildDashboardData({ previousPeriodIncomeChangePercent: null }),
    );

    const view = await renderScreen();

    await waitFor(() => {
      expect(screen.getByTestId("dashboard-summary-card")).toBeTruthy();
    });
    expect(screen.queryByTestId("dashboard-comparison-badge")).toBeNull();

    view.unmount();
    await flush();
  });

  it("shows an empty state when there are no incomplete goals", async () => {
    mockedApiFetch.mockResolvedValue(buildDashboardData({ incompleteGoals: [] }));

    const view = await renderScreen();

    await waitFor(() => {
      expect(screen.getByText("Nenhuma meta em andamento.")).toBeTruthy();
    });

    view.unmount();
    await flush();
  });

  it("re-fetches with the new period when the segmented toggle changes", async () => {
    mockedApiFetch.mockResolvedValue(buildDashboardData());

    const view = await renderScreen();

    await waitFor(() => {
      expect(screen.getByTestId("dashboard-summary-card")).toBeTruthy();
    });

    mockedApiFetch.mockClear();
    fireEvent.press(screen.getByTestId("dashboard-period-toggle-day"));

    await waitFor(() => {
      expect(mockedApiFetch).toHaveBeenCalledWith(expect.stringContaining("period=day"));
    });

    view.unmount();
    await flush();
  });

  it("shows date range inputs and does not fetch until both dates are complete for period=custom", async () => {
    mockedApiFetch.mockResolvedValue(buildDashboardData());

    const view = await renderScreen();
    await waitFor(() => {
      expect(screen.getByTestId("dashboard-summary-card")).toBeTruthy();
    });

    mockedApiFetch.mockClear();
    fireEvent.press(screen.getByTestId("dashboard-period-toggle-custom"));

    await waitFor(() => {
      expect(screen.getByTestId("dashboard-date-from")).toBeTruthy();
    });
    expect(mockedApiFetch).not.toHaveBeenCalled();

    fireEvent.changeText(screen.getByTestId("dashboard-date-from"), "01012026");
    expect(mockedApiFetch).not.toHaveBeenCalled();

    fireEvent.changeText(screen.getByTestId("dashboard-date-to"), "31012026");

    await waitFor(() => {
      expect(mockedApiFetch).toHaveBeenCalledWith(
        expect.stringContaining("dateFrom=2026-01-01"),
      );
    });

    view.unmount();
    await flush();
  });
});
