import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor, within } from "@testing-library/react-native";

import { apiFetch } from "../../lib/api-client";

import { DebtsListScreen } from "./DebtsListScreen";

jest.mock("../../lib/api-client", () => ({
  apiFetch: jest.fn(),
  ApiError: class ApiError extends Error {},
}));

const mockedApiFetch = apiFetch as jest.Mock;

const Stack = createNativeStackNavigator();

const buildDebt = (overrides: Record<string, unknown>) => ({
  workspace: "PERSONAL",
  categoryId: null,
  totalAmount: "3000.00",
  paidAmount: "1000.00",
  remainingAmount: "2000.00",
  startDate: "2026-01-10",
  endDate: null,
  interestRate: null,
  totalInstallments: 3,
  paidInstallments: 1,
  notes: null,
  createdAt: "2026-01-10T12:00:00.000Z",
  updatedAt: "2026-01-10T12:00:00.000Z",
  ...overrides,
});

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
          <Stack.Screen name="Debts" component={DebtsListScreen} />
        </Stack.Navigator>
      </NavigationContainer>
    </QueryClientProvider>,
  );
}

// See the matching note in LoginScreen.test.tsx.
const flush = () => new Promise<void>((resolve) => setTimeout(resolve, 50));

describe("DebtsListScreen", () => {
  it("groups debts by status, most urgent first", async () => {
    mockedApiFetch.mockResolvedValue([
      buildDebt({ id: "active", name: "Geladeira", status: "ACTIVE" }),
      buildDebt({ id: "paid-off", name: "Notebook", status: "PAID_OFF" }),
      buildDebt({ id: "overdue", name: "Carro", status: "OVERDUE" }),
    ]);

    const view = await renderScreen();

    await waitFor(() => {
      expect(screen.getByTestId("debt-section-OVERDUE")).toBeTruthy();
    });
    expect(within(screen.getByTestId("debt-section-OVERDUE")).getByText("Carro")).toBeTruthy();
    expect(within(screen.getByTestId("debt-section-ACTIVE")).getByText("Geladeira")).toBeTruthy();
    expect(within(screen.getByTestId("debt-section-PAID_OFF")).getByText("Notebook")).toBeTruthy();
    expect(within(screen.getByTestId("debt-status-overdue")).getByText("Atrasada")).toBeTruthy();
    expect(screen.getByText("Atrasadas")).toBeTruthy();
    view.unmount();
    await flush();
  });

  it("shows an empty state", async () => {
    mockedApiFetch.mockResolvedValue([]);

    const view = await renderScreen();

    await waitFor(() => {
      expect(screen.getByText("Nenhuma dívida ainda.")).toBeTruthy();
    });
    view.unmount();
    await flush();
  });
});
