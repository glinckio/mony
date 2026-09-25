import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react-native";

import { apiFetch } from "../../lib/api-client";

import { DebtDetailScreen } from "./DebtDetailScreen";

jest.mock("../../lib/api-client", () => ({
  apiFetch: jest.fn(),
  ApiError: class ApiError extends Error {},
}));

const mockedApiFetch = apiFetch as jest.Mock;

const Stack = createNativeStackNavigator();

const DEBT = {
  id: "debt-1",
  workspace: "PERSONAL",
  categoryId: null,
  name: "Geladeira",
  totalAmount: "3500.00",
  paidAmount: "1166.66",
  remainingAmount: "2333.34",
  startDate: "2099-01-10",
  endDate: null,
  interestRate: "1.99",
  totalInstallments: 3,
  paidInstallments: 1,
  notes: null,
  status: "ACTIVE",
  createdAt: "2026-01-10T12:00:00.000Z",
  updatedAt: "2026-01-10T12:00:00.000Z",
  installments: [
    {
      id: "inst-1",
      installmentNo: 1,
      amount: "1166.66",
      dueDate: "2099-01-10",
      status: "PAID",
      paymentDate: "2099-01-08",
      transactionId: "tx-1",
    },
    {
      id: "inst-2",
      installmentNo: 2,
      amount: "1166.66",
      dueDate: "2099-02-10",
      status: "PENDING",
      paymentDate: null,
      transactionId: "tx-2",
    },
    {
      id: "inst-3",
      installmentNo: 3,
      amount: "1166.68",
      dueDate: "2020-03-10",
      status: "PENDING",
      paymentDate: null,
      transactionId: "tx-3",
    },
  ],
};

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
          <Stack.Screen
            name="DebtDetail"
            component={DebtDetailScreen}
            initialParams={{ debtId: "debt-1" }}
          />
        </Stack.Navigator>
      </NavigationContainer>
    </QueryClientProvider>,
  );
}

// See the matching note in LoginScreen.test.tsx.
const flush = () => new Promise<void>((resolve) => setTimeout(resolve, 50));

describe("DebtDetailScreen", () => {
  beforeEach(() => {
    mockedApiFetch.mockReset();
    mockedApiFetch.mockResolvedValue(DEBT);
  });

  it("shows a pay action for pending installments and an undo for paid ones", async () => {
    const view = await renderScreen();

    await waitFor(() => {
      expect(screen.getByTestId("installment-row-1")).toBeTruthy();
    });
    expect(screen.getByTestId("cancel-payment-1")).toBeTruthy();
    expect(screen.queryByTestId("pay-installment-1")).toBeNull();
    expect(screen.getByTestId("pay-installment-2")).toBeTruthy();
    expect(within(screen.getByTestId("installment-status-1")).getByText("Paga")).toBeTruthy();
    expect(within(screen.getByTestId("installment-status-2")).getByText("Pendente")).toBeTruthy();
    // Pending and past due.
    expect(within(screen.getByTestId("installment-status-3")).getByText("Vencida")).toBeTruthy();
    expect(screen.getByText(/apenas informativo/)).toBeTruthy();
    view.unmount();
    await flush();
  });

  it("opens the pay sheet defaulting the amount to the installment's own amount", async () => {
    const view = await renderScreen();

    await waitFor(() => {
      expect(screen.getByTestId("pay-installment-2")).toBeTruthy();
    });
    fireEvent.press(screen.getByTestId("pay-installment-2"));

    await waitFor(() => {
      expect(screen.getByTestId("paid-amount-input").props.value).toMatch(/1\.166,66/);
    });
    expect(screen.getByTestId("payment-date-input").props.value).toMatch(/^\d{2}\/\d{2}\/\d{4}$/);
    view.unmount();
    await flush();
  });
});
