import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";

import { apiFetch } from "../../lib/api-client";

import { DebtFormScreen } from "./DebtFormScreen";

jest.mock("../../lib/api-client", () => ({
  apiFetch: jest.fn(),
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

const EXPENSE_CATEGORY = {
  id: "cat-1",
  name: "Financiamentos",
  type: "EXPENSE",
  color: "#3B82F6",
  icon: "car-outline",
  createdAt: "2026-01-15T12:00:00.000Z",
};

const buildDebt = (overrides: Record<string, unknown> = {}) => ({
  id: "debt-1",
  workspace: "PERSONAL",
  categoryId: "cat-1",
  name: "Carro",
  totalAmount: "12000.00",
  paidAmount: "0.00",
  remainingAmount: "12000.00",
  startDate: "2026-01-10",
  endDate: null,
  interestRate: "1.99",
  totalInstallments: 12,
  paidInstallments: 0,
  notes: null,
  status: "ACTIVE",
  createdAt: "2026-01-10T12:00:00.000Z",
  updatedAt: "2026-01-10T12:00:00.000Z",
  ...overrides,
});

function renderScreen(initialParams?: Record<string, unknown>) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, refetchOnWindowFocus: false, gcTime: 0 },
    },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <NavigationContainer>
        <Stack.Navigator screenOptions={{ headerShown: false, animation: "none" }}>
          <Stack.Screen name="DebtForm" component={DebtFormScreen} initialParams={initialParams} />
        </Stack.Navigator>
      </NavigationContainer>
    </QueryClientProvider>,
  );
}

// See the matching note in LoginScreen.test.tsx.
const flush = () => new Promise<void>((resolve) => setTimeout(resolve, 50));

describe("DebtFormScreen", () => {
  beforeEach(() => {
    mockedApiFetch.mockReset();
    mockedApiFetch.mockResolvedValue([EXPENSE_CATEGORY]);
  });

  it("only offers expense categories, defaulting to the automatic one", async () => {
    const view = await renderScreen();

    await waitFor(() => {
      expect(screen.getByTestId("category-option-cat-1")).toBeTruthy();
    });
    expect(mockedApiFetch).toHaveBeenCalledWith("/categories?type=EXPENSE");
    expect(screen.getByTestId("category-option-none").props.accessibilityState.selected).toBe(true);
    view.unmount();
    await flush();
  });

  it("keeps installment count and start date editable when nothing is paid", async () => {
    const view = await renderScreen({ debt: buildDebt() });

    await waitFor(() => {
      expect(screen.getByTestId("name-input").props.value).toBe("Carro");
    });
    expect(screen.getByTestId("total-installments-input").props.editable).not.toBe(false);
    expect(screen.getByTestId("start-date-input").props.editable).not.toBe(false);
    expect(screen.queryByTestId("structure-locked-hint")).toBeNull();
    view.unmount();
    await flush();
  });

  it("disables installment count and start date, with an explanation, once an installment is paid", async () => {
    const view = await renderScreen({ debt: buildDebt({ paidInstallments: 2 }) });

    await waitFor(() => {
      expect(screen.getByTestId("total-installments-input").props.editable).toBe(false);
    });
    expect(screen.getByTestId("total-installments-input").props.value).toBe("12");
    expect(screen.getByTestId("start-date-input").props.editable).toBe(false);
    expect(screen.getByTestId("structure-locked-hint")).toBeTruthy();
    view.unmount();
    await flush();
  });

  it("warns and blocks submit when the user has no expense category", async () => {
    mockedApiFetch.mockResolvedValue([]);
    const view = await renderScreen();

    await waitFor(() => {
      expect(screen.getByTestId("no-expense-category-banner")).toBeTruthy();
    });
    expect(screen.getByTestId("submit-button").props.accessibilityState.disabled).toBe(true);
    view.unmount();
    await flush();
  });

  it("shows validation errors when submitting empty required fields", async () => {
    const view = await renderScreen();
    await waitFor(() => {
      expect(screen.getByTestId("category-option-cat-1")).toBeTruthy();
    });

    fireEvent.press(screen.getByTestId("submit-button"));

    await waitFor(() => {
      expect(screen.getByText("Nome é obrigatório")).toBeTruthy();
    });
    expect(screen.getByText("Número de parcelas é obrigatório")).toBeTruthy();
    view.unmount();
    await flush();
  });

  // Kept last, and the only test that types into the form: typing into
  // the watched amount/count fields leaves a pending react-hook-form
  // update that breaks whichever test renders next (see
  // docs/steering/tech.md, TanStack/RHF gotcha). The too-small-total
  // rule itself is covered in packages/shared-types' debt.test.ts.
  it("previews the per-installment amount", async () => {
    const view = await renderScreen();
    await waitFor(() => {
      expect(screen.getByTestId("category-option-cat-1")).toBeTruthy();
    });

    // Digits are cents: "100000" = R$ 1.000,00 → 3x R$ 333,33.
    fireEvent.changeText(screen.getByTestId("total-amount-input"), "100000");
    fireEvent.changeText(screen.getByTestId("total-installments-input"), "3");

    await waitFor(() => {
      expect(screen.getByTestId("installment-preview")).toHaveTextContent(/3x de R\$\s333,33/);
    });
    await flush();
    view.unmount();
    await flush();
  });
});
