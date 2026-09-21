import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";

import { apiFetch } from "../../lib/api-client";

import { TransactionFormScreen } from "./TransactionFormScreen";

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
          <Stack.Screen
            name="TransactionForm"
            component={TransactionFormScreen}
            initialParams={initialParams}
          />
        </Stack.Navigator>
      </NavigationContainer>
    </QueryClientProvider>,
  );
}

// See the matching note in LoginScreen.test.tsx.
const flush = () => new Promise<void>((resolve) => setTimeout(resolve, 50));

describe("TransactionFormScreen", () => {
  beforeEach(() => {
    mockedApiFetch.mockReset();
    mockedApiFetch.mockResolvedValue([
      {
        id: "cat-1",
        name: "Aluguel",
        type: "EXPENSE",
        color: "#3B82F6",
        icon: "home-outline",
        createdAt: "2026-01-15T12:00:00.000Z",
      },
    ]);
  });

  it("shows the status toggle for expenses", async () => {
    const view = await renderScreen();

    await waitFor(() => {
      expect(screen.getByTestId("status-option-PENDING")).toBeTruthy();
    });
    view.unmount();
    await flush();
  });

  it("hides the status toggle when type is income", async () => {
    const view = await renderScreen();

    fireEvent.press(screen.getByTestId("type-option-INCOME"));

    await waitFor(() => {
      expect(screen.queryByTestId("status-option-PENDING")).toBeNull();
    });
    view.unmount();
    await flush();
  });

  // Pre-filled/editing case is asserted here, before any test drives the
  // recurring-toggle + submit flow — that combination leaves a pending
  // react-hook-form/react-query microtask that bleeds into whichever
  // render runs right after it (same class of RTL/React 19 teardown
  // ordering issue noted in LoginScreen.test.tsx), so this ordering is
  // deliberate, not incidental.
  it("hides the recurring toggle when editing, and pre-fills fields", async () => {
    const view = await renderScreen({
      transaction: {
        id: "tx-1",
        categoryId: "cat-1",
        workspace: "PERSONAL",
        type: "EXPENSE",
        status: "PENDING",
        description: "Aluguel",
        amount: "1500.50",
        date: "2026-01-15",
        recurring: false,
        createdAt: "2026-01-15T12:00:00.000Z",
        updatedAt: "2026-01-15T12:00:00.000Z",
      },
    });

    await waitFor(() => {
      expect(screen.getByTestId("description-input").props.value).toBe("Aluguel");
    });
    expect(screen.queryByTestId("recurring-toggle")).toBeNull();
    view.unmount();
    await flush();
  });

  it("shows validation errors when submitting empty required fields", async () => {
    const view = await renderScreen();

    fireEvent.press(screen.getByTestId("submit-button"));

    await waitFor(() => {
      expect(screen.getByText("Categoria é obrigatória")).toBeTruthy();
      expect(screen.getByText("Descrição é obrigatória")).toBeTruthy();
      expect(screen.getByText("Data é obrigatória")).toBeTruthy();
    });
    view.unmount();
    await flush();
  });

  it("rejects recurringMonths outside 1-60", async () => {
    const view = await renderScreen();

    fireEvent.press(screen.getByTestId("recurring-toggle"));
    await waitFor(() => {
      expect(screen.getByTestId("recurring-months-input")).toBeTruthy();
    });

    fireEvent.changeText(screen.getByTestId("recurring-months-input"), "61");
    fireEvent.press(screen.getByTestId("submit-button"));

    await waitFor(() => {
      expect(screen.getByText("Recorrência deve durar entre 1 e 60 meses")).toBeTruthy();
    });
    view.unmount();
    await flush();
  });
});
