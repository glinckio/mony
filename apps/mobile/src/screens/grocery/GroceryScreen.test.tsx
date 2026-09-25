import { color } from "@mony/ui-tokens";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react-native";
import { Share } from "react-native";

import { apiFetch } from "../../lib/api-client";
import { useToastStore } from "../../lib/toast-store";

import { GroceryScreen } from "./GroceryScreen";

jest.mock("../../lib/api-client", () => ({
  apiFetch: jest.fn(),
  ApiError: class ApiError extends Error {},
}));

const mockedApiFetch = apiFetch as jest.Mock;

const Stack = createNativeStackNavigator();

const ITEMS = [
  {
    id: "soap",
    name: "Sabonete",
    unit: "un",
    idealQuantity: "4.00",
    currentQuantity: "0.00",
    estimatedPrice: "2.50",
    category: "PERSONAL_CARE",
    missing: true,
    createdAt: "2026-09-25T12:00:00.000Z",
    updatedAt: "2026-09-25T12:00:00.000Z",
  },
  {
    id: "detergent",
    name: "Detergente",
    unit: "un",
    idealQuantity: "2.00",
    currentQuantity: "3.00",
    estimatedPrice: "3.00",
    category: "CLEANING",
    missing: false,
    createdAt: "2026-09-25T12:00:00.000Z",
    updatedAt: "2026-09-25T12:00:00.000Z",
  },
];

function mockApi({
  items = ITEMS,
  budget = { amount: "100.00", setAt: "2026-09-25T12:00:00.000Z" },
  summary = { totalItemCount: 2, missingItemCount: 1, estimatedPurchaseTotal: "95.00" },
}: {
  items?: unknown[];
  budget?: unknown;
  summary?: unknown;
} = {}) {
  mockedApiFetch.mockImplementation((path: string) => {
    if (path === "/grocery/items") return Promise.resolve(items);
    if (path === "/grocery/budget") return Promise.resolve(budget);
    if (path === "/grocery/summary") return Promise.resolve(summary);
    return Promise.reject(new Error(`unexpected ${path}`));
  });
}

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
          <Stack.Screen name="Grocery" component={GroceryScreen} />
        </Stack.Navigator>
      </NavigationContainer>
    </QueryClientProvider>,
  );
}

// See the matching note in LoginScreen.test.tsx.
const flush = () => new Promise<void>((resolve) => setTimeout(resolve, 50));

// The colored fill is the bar's only child (ProgressBar has no testID on it).
const progressFill = () => screen.getByTestId("grocery-budget-progress").children[0];

describe("GroceryScreen", () => {
  let shareSpy: jest.SpyInstance;

  beforeEach(() => {
    mockedApiFetch.mockReset();
    useToastStore.getState().hide();
    shareSpy = jest.spyOn(Share, "share").mockResolvedValue({ action: Share.sharedAction });
  });

  afterEach(() => {
    shareSpy.mockRestore();
  });

  it("shows the budget, estimate, danger-toned bar above 90% and item counts", async () => {
    mockApi();
    const view = await renderScreen();

    await waitFor(() => {
      expect(screen.getByTestId("grocery-budget-card")).toBeTruthy();
    });
    expect(screen.getByTestId("grocery-budget-amount")).toHaveTextContent(/R\$\s100,00/);
    expect(screen.getByTestId("grocery-estimated-total")).toHaveTextContent(/R\$\s95,00/);
    expect(screen.getByTestId("grocery-remaining")).toHaveTextContent(/R\$\s5,00/);
    expect(screen.getByTestId("grocery-budget-progress").props.accessibilityValue.now).toBe(95);
    expect(progressFill()).toHaveStyle({ backgroundColor: color.danger });
    // Estimate is still within budget: balance in success color.
    expect(screen.getByTestId("grocery-remaining")).toHaveStyle({ color: color.success });
    expect(screen.getByTestId("grocery-counts")).toHaveTextContent("2 itens · 1 faltando");
    // Grouped under pt-BR category labels, missing badge only on the missing item.
    expect(screen.getByText("Higiene Pessoal")).toBeTruthy();
    expect(screen.getByText("Limpeza")).toBeTruthy();
    expect(screen.getByTestId("grocery-missing-soap")).toBeTruthy();
    expect(screen.queryByTestId("grocery-missing-detergent")).toBeNull();
    // Can't go below zero.
    expect(screen.getByTestId("grocery-decrement-soap").props.accessibilityState.disabled).toBe(
      true,
    );
    view.unmount();
    await flush();
  });

  it("fills the bar and shows a zero balance in danger color when the estimate exceeds the budget", async () => {
    mockApi({ budget: { amount: "50.00", setAt: "2026-09-25T12:00:00.000Z" } });
    const view = await renderScreen();

    await waitFor(() => {
      expect(screen.getByTestId("grocery-remaining")).toHaveTextContent(/R\$\s0,00/);
    });
    expect(screen.getByTestId("grocery-remaining")).toHaveStyle({ color: color.danger });
    expect(screen.getByTestId("grocery-budget-progress").props.accessibilityValue.now).toBe(100);
    expect(progressFill()).toHaveStyle({ backgroundColor: color.danger });
    view.unmount();
    await flush();
  });

  it("uses the success tone up to 70% and the warning tone up to 90%", async () => {
    // 95 / 200 = 47.5%
    mockApi({ budget: { amount: "200.00", setAt: "2026-09-25T12:00:00.000Z" } });
    const first = await renderScreen();
    await waitFor(() => {
      expect(screen.getByTestId("grocery-remaining")).toHaveTextContent(/R\$\s105,00/);
    });
    expect(progressFill()).toHaveStyle({ backgroundColor: color.success });
    first.unmount();
    await flush();

    // 95 / 120 = 79.2%
    mockApi({ budget: { amount: "120.00", setAt: "2026-09-25T12:00:00.000Z" } });
    const second = await renderScreen();
    await waitFor(() => {
      expect(screen.getByTestId("grocery-remaining")).toHaveTextContent(/R\$\s25,00/);
    });
    expect(progressFill()).toHaveStyle({ backgroundColor: color.warning });
    second.unmount();
    await flush();
  });

  it("says the budget isn't set yet and hides the remaining balance", async () => {
    mockApi({ budget: { amount: null, setAt: null } });
    const view = await renderScreen();

    await waitFor(() => {
      expect(screen.getByTestId("grocery-budget-amount")).toHaveTextContent("Não definido");
    });
    expect(screen.queryByTestId("grocery-remaining")).toBeNull();
    view.unmount();
    await flush();
  });

  it("filters down to missing items without changing the whole-list budget card", async () => {
    mockApi();
    const view = await renderScreen();

    await waitFor(() => {
      expect(screen.getByText("Detergente")).toBeTruthy();
    });
    fireEvent.press(within(screen.getByTestId("grocery-filter")).getByText("Faltando"));

    await waitFor(() => {
      expect(screen.queryByText("Detergente")).toBeNull();
    });
    expect(screen.getByText("Sabonete")).toBeTruthy();
    // The summary is filter-independent (legacy's changed with the filter).
    expect(screen.getByTestId("grocery-counts")).toHaveTextContent("2 itens · 1 faltando");
    expect(screen.getByTestId("grocery-estimated-total")).toHaveTextContent(/R\$\s95,00/);
    view.unmount();
    await flush();
  });

  it("shares the missing items, grouped by category, with the estimated total", async () => {
    mockApi({
      items: [
        ...ITEMS,
        {
          ...ITEMS[0],
          id: "rice",
          name: "Arroz",
          unit: "kg",
          idealQuantity: "5.00",
          currentQuantity: "1.50",
          category: "PANTRY",
        },
      ],
    });
    const view = await renderScreen();

    await waitFor(() => {
      expect(screen.getByText("Arroz")).toBeTruthy();
    });
    fireEvent.press(screen.getByTestId("share-grocery-list"));

    await waitFor(() => {
      expect(shareSpy).toHaveBeenCalledTimes(1);
    });
    const { message } = shareSpy.mock.calls[0][0] as { message: string };
    expect(message).toContain("*Higiene Pessoal*\n- Sabonete: 4 un\n");
    expect(message).toContain("*Mercearia*\n- Arroz: 3,5 kg\n");
    expect(message).not.toContain("Detergente");
    expect(message).toMatch(/\*Valor estimado total: R\$\s95,00\*$/);
    view.unmount();
    await flush();
  });

  it("doesn't open the share sheet when nothing is missing", async () => {
    mockApi({
      items: [ITEMS[1]],
      summary: { totalItemCount: 1, missingItemCount: 0, estimatedPurchaseTotal: "0.00" },
    });
    const view = await renderScreen();

    await waitFor(() => {
      expect(screen.getByText("Detergente")).toBeTruthy();
    });
    fireEvent.press(screen.getByTestId("share-grocery-list"));

    await waitFor(() => {
      expect(useToastStore.getState().message).toBe("Não há itens faltando para compartilhar.");
    });
    expect(shareSpy).not.toHaveBeenCalled();
    view.unmount();
    await flush();
  });

  // Kept last: it submits the budget sheet (see docs/steering/tech.md,
  // RHF/TanStack gotcha). The successful save is GroceryScreen.budget.test.tsx.
  it("shows generic pt-BR copy, never the API message, when saving the budget fails", async () => {
    mockApi();
    const reads = mockedApiFetch.getMockImplementation()!;
    mockedApiFetch.mockImplementation((path: string, init?: { method?: string }) =>
      init?.method === "POST"
        ? Promise.reject(new Error("amount must not be less than 0"))
        : reads(path, init),
    );
    const view = await renderScreen();

    await waitFor(() => {
      expect(screen.getByTestId("edit-grocery-budget")).toBeTruthy();
    });
    fireEvent.press(screen.getByTestId("edit-grocery-budget"));
    await waitFor(() => {
      expect(screen.getByTestId("save-grocery-budget")).toBeTruthy();
    });
    await flush();
    fireEvent.press(screen.getByTestId("save-grocery-budget"));

    await waitFor(() => {
      expect(
        screen.getByText("Não foi possível salvar o orçamento. Tente novamente."),
      ).toBeTruthy();
    });
    expect(screen.queryByText(/must not be less than/)).toBeNull();
    expect(screen.getByTestId("grocery-budget-amount")).toHaveTextContent(/R\$\s100,00/);
    await flush();
    view.unmount();
    await flush();
  });
});
