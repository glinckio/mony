import type { Category, Transaction } from "@mony/shared-types";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import { StyleSheet, Text } from "react-native";

import { apiFetch } from "../../lib/api-client";

import { TransactionsListScreen } from "./TransactionsListScreen";

jest.mock("../../lib/api-client", () => ({
  apiFetch: jest.fn(),
  ApiError: class ApiError extends Error {},
}));

const mockedApiFetch = apiFetch as jest.Mock;

const Stack = createNativeStackNavigator();

const BILL: Transaction = {
  id: "tx-1",
  categoryId: "cat-1",
  workspace: "PERSONAL",
  type: "EXPENSE",
  status: "PENDING",
  description: "Conta de luz",
  amount: "150.00",
  date: "2026-01-10",
  recurring: false,
  createdAt: "2026-01-10T12:00:00.000Z",
  updatedAt: "2026-01-10T12:00:00.000Z",
};
const SALARY: Transaction = {
  ...BILL,
  id: "tx-2",
  categoryId: "cat-2",
  type: "INCOME",
  status: "PAID",
  description: "Salário",
  amount: "5000.00",
};
const CATEGORIES: Category[] = [
  {
    id: "cat-1",
    name: "Contas",
    type: "EXPENSE",
    color: "#3B82F6",
    icon: "receipt-outline",
    createdAt: "2026-01-15T12:00:00.000Z",
  },
];

const page = (items: Transaction[]) => ({ items, total: items.length, page: 1, perPage: 20 });

type Handler = (params: URLSearchParams) => Promise<unknown>;

// GET /transactions answered by `onList` (default: every entry), the
// category badges, and whatever else the test passes through `other`.
function mockApi({
  onList = () => Promise.resolve(page([BILL, SALARY])),
  other,
}: { onList?: Handler; other?: (path: string, init?: RequestInit) => Promise<unknown> } = {}) {
  mockedApiFetch.mockImplementation((path: string, init?: RequestInit) => {
    if (path.startsWith("/transactions?")) return onList(new URLSearchParams(path.split("?")[1]));
    if (path === "/categories") return Promise.resolve(CATEGORIES);
    if (other) return other(path, init);
    return Promise.reject(new Error(`unexpected ${path}`));
  });
}

const listRequests = () =>
  mockedApiFetch.mock.calls
    .map(([path]) => path as string)
    .filter((path) => path.startsWith("/transactions?"));

function TransactionFormStub() {
  return <Text>Novo lançamento</Text>;
}

function renderScreen() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, refetchOnWindowFocus: false, gcTime: 0 } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <NavigationContainer>
        <Stack.Navigator screenOptions={{ headerShown: false, animation: "none" }}>
          <Stack.Screen name="Transactions" component={TransactionsListScreen} />
          <Stack.Screen name="TransactionForm" component={TransactionFormStub} />
        </Stack.Navigator>
      </NavigationContainer>
    </QueryClientProvider>,
  );
}

// Rows loading a new filter are dimmed by a wrapper around the row.
function isDimmed(testID: string) {
  let node: ReturnType<typeof screen.getByTestId> | null = screen.getByTestId(testID);
  while (node) {
    if (StyleSheet.flatten(node.props.style)?.opacity === 0.5) return true;
    node = node.parent;
  }
  return false;
}

// See the matching note in LoginScreen.test.tsx.
const flush = () => new Promise<void>((resolve) => setTimeout(resolve, 50));

describe("TransactionsListScreen", () => {
  beforeEach(() => {
    mockedApiFetch.mockReset();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("lists the entries by day with their category, amount and status", async () => {
    mockApi();
    const view = await renderScreen();

    await waitFor(() => {
      expect(screen.getByTestId("transaction-row-tx-1")).toBeTruthy();
    });
    expect(screen.getByText(/^10 de janeiro/)).toBeTruthy();
    expect(screen.getByText("Contas")).toBeTruthy();
    expect(screen.getByText("− R$ 150,00")).toBeTruthy();
    expect(screen.getByText("+ R$ 5.000,00")).toBeTruthy();
    expect(screen.getByText("A pagar")).toBeTruthy();
    expect(listRequests()).toEqual(["/transactions?page=1&perPage=20"]);
    view.unmount();
    await flush();
  });

  it("searches once typing pauses for 300 ms, not on every keystroke", async () => {
    mockApi({
      onList: (params) =>
        Promise.resolve(page(params.get("search") === "luz" ? [BILL] : [BILL, SALARY])),
    });
    const view = await renderScreen();
    await waitFor(() => {
      expect(screen.getByTestId("transaction-row-tx-2")).toBeTruthy();
    });

    jest.useFakeTimers();
    await fireEvent.changeText(screen.getByTestId("search-input"), "l");
    await act(async () => {
      jest.advanceTimersByTime(200);
    });
    await fireEvent.changeText(screen.getByTestId("search-input"), "lu");
    await act(async () => {
      jest.advanceTimersByTime(200);
    });
    await fireEvent.changeText(screen.getByTestId("search-input"), "luz");
    await act(async () => {
      jest.advanceTimersByTime(299);
    });
    expect(listRequests()).toEqual(["/transactions?page=1&perPage=20"]);

    await act(async () => {
      jest.advanceTimersByTime(1);
    });
    expect(listRequests()).toEqual([
      "/transactions?page=1&perPage=20",
      "/transactions?page=1&perPage=20&search=luz",
    ]);

    // Still on fake timers: waitFor advances them (TanStack batches its
    // updates on a timer).
    await waitFor(() => {
      expect(screen.queryByTestId("transaction-row-tx-2")).toBeNull();
    });
    expect(screen.getByTestId("transaction-row-tx-1")).toBeTruthy();
    expect(screen.getByTestId("search-input").props.value).toBe("luz");
    jest.useRealTimers();
    view.unmount();
    await flush();
  });

  it("keeps the current rows, dimmed, while a new filter loads", async () => {
    let answerExpenses!: (value: unknown) => void;
    mockApi({
      onList: (params) =>
        params.get("type") === "EXPENSE"
          ? new Promise((resolve) => {
              answerExpenses = resolve;
            })
          : Promise.resolve(page([BILL, SALARY])),
    });
    const view = await renderScreen();
    await waitFor(() => {
      expect(screen.getByTestId("transaction-row-tx-2")).toBeTruthy();
    });
    expect(isDimmed("transaction-row-tx-1")).toBe(false);

    await fireEvent.press(screen.getByTestId("type-filter-EXPENSE"));

    await waitFor(() => {
      expect(listRequests()).toContain("/transactions?page=1&perPage=20&type=EXPENSE");
    });
    // No skeleton flash: the previous rows stay, dimmed.
    expect(screen.queryByLabelText("Carregando lançamentos")).toBeNull();
    expect(screen.getByTestId("transaction-row-tx-2")).toBeTruthy();
    await waitFor(() => {
      expect(isDimmed("transaction-row-tx-1")).toBe(true);
    });

    await act(async () => {
      answerExpenses(page([BILL]));
    });

    await waitFor(() => {
      expect(screen.queryByTestId("transaction-row-tx-2")).toBeNull();
    });
    expect(isDimmed("transaction-row-tx-1")).toBe(false);
    view.unmount();
    await flush();
  });

  it("marks an expense to pay as paid from its status pill", async () => {
    let paid = false;
    mockApi({
      onList: () => Promise.resolve(page([{ ...BILL, status: paid ? "PAID" : "PENDING" }])),
      other: (path, init) => {
        if (path === "/transactions/tx-1/status" && init?.method === "PATCH") {
          paid = true;
          return Promise.resolve(undefined);
        }
        return Promise.reject(new Error(`unexpected ${path}`));
      },
    });
    const view = await renderScreen();
    await waitFor(() => {
      expect(screen.getByText("A pagar")).toBeTruthy();
    });

    await fireEvent.press(screen.getByLabelText("Marcar como pago"));

    await waitFor(() => {
      expect(screen.getByText("Pago")).toBeTruthy();
    });
    const patch = mockedApiFetch.mock.calls.find(([path]) => path === "/transactions/tx-1/status");
    expect(JSON.parse(patch?.[1].body)).toEqual({ status: "PAID" });
    view.unmount();
    await flush();
  });
});
