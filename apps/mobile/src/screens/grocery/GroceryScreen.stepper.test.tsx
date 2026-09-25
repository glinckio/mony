import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";

import { apiFetch } from "../../lib/api-client";
import { useToastStore } from "../../lib/toast-store";

import { GroceryScreen } from "./GroceryScreen";

// Quick +/- stepper (mutations) kept apart from GroceryScreen.test.tsx's
// render-only tests — see docs/steering/tech.md: a pending RHF/TanStack
// microtask can leave the next test's render() empty. The rapid-tap test
// does exactly that, so it stays last.

jest.mock("../../lib/api-client", () => ({
  apiFetch: jest.fn(),
  ApiError: class ApiError extends Error {},
}));

const mockedApiFetch = apiFetch as jest.Mock;

const Stack = createNativeStackNavigator();

const SOAP = {
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
};

const RICE = {
  ...SOAP,
  id: "rice",
  name: "Arroz",
  unit: "kg",
  idealQuantity: "5.00",
  currentQuantity: "0.50",
  estimatedPrice: "6.00",
  category: "PANTRY",
};

// `summaries` are served in order (last one repeats), so a test can see
// the card refresh after a mutation.
function mockApi({
  summaries = [{ totalItemCount: 2, missingItemCount: 2, estimatedPurchaseTotal: "37.00" }],
  patch,
}: {
  summaries?: unknown[];
  patch: (path: string, body: Record<string, unknown>) => Promise<unknown>;
}) {
  let summaryCalls = 0;
  mockedApiFetch.mockImplementation((path: string, init?: { method?: string; body?: string }) => {
    if (init?.method === "PATCH") return patch(path, JSON.parse(init.body ?? "{}"));
    if (path === "/grocery/items") return Promise.resolve([SOAP, RICE]);
    if (path === "/grocery/budget") {
      return Promise.resolve({ amount: "100.00", setAt: "2026-09-25T12:00:00.000Z" });
    }
    if (path === "/grocery/summary") {
      const summary = summaries[Math.min(summaryCalls, summaries.length - 1)];
      summaryCalls++;
      return Promise.resolve(summary);
    }
    return Promise.reject(new Error(`unexpected ${path}`));
  });
}

const patchCalls = () =>
  mockedApiFetch.mock.calls
    .filter(([, init]) => init?.method === "PATCH")
    .map(([path, init]) => [path, JSON.parse(init.body)]);

function renderScreen() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, refetchOnWindowFocus: false, gcTime: 0 },
      mutations: { retry: false },
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

describe("GroceryScreen quick +/- stepper", () => {
  beforeEach(() => {
    mockedApiFetch.mockReset();
    useToastStore.getState().hide();
  });

  it("+ adds 1 to the current quantity, updates the row and refreshes the summary", async () => {
    mockApi({
      summaries: [
        { totalItemCount: 2, missingItemCount: 2, estimatedPurchaseTotal: "37.00" },
        { totalItemCount: 2, missingItemCount: 2, estimatedPurchaseTotal: "34.50" },
      ],
      patch: () => Promise.resolve({ ...SOAP, currentQuantity: "1.00" }),
    });
    const view = await renderScreen();

    await waitFor(() => {
      expect(screen.getByText(/^0 de 4 un/)).toBeTruthy();
    });
    fireEvent.press(screen.getByTestId("grocery-increment-soap"));

    await waitFor(() => {
      expect(screen.getByText(/^1 de 4 un/)).toBeTruthy();
    });
    expect(patchCalls()).toEqual([["/grocery/items/soap", { currentQuantity: 1 }]]);
    await waitFor(() => {
      expect(screen.getByTestId("grocery-estimated-total")).toHaveTextContent(/R\$\s34,50/);
    });
    await flush();
    view.unmount();
    await flush();
  });

  it("- never takes the quantity below 0 (0,5 goes to 0)", async () => {
    mockApi({ patch: () => Promise.resolve({ ...RICE, currentQuantity: "0.00" }) });
    const view = await renderScreen();

    await waitFor(() => {
      expect(screen.getByText(/^0,5 de 5 kg/)).toBeTruthy();
    });
    fireEvent.press(screen.getByTestId("grocery-decrement-rice"));

    await waitFor(() => {
      expect(screen.getByText(/^0 de 5 kg/)).toBeTruthy();
    });
    expect(patchCalls()).toEqual([["/grocery/items/rice", { currentQuantity: 0 }]]);
    await waitFor(() => {
      expect(screen.getByTestId("grocery-decrement-rice").props.accessibilityState.disabled).toBe(
        true,
      );
    });
    await flush();
    view.unmount();
    await flush();
  });

  it("shows a pt-BR toast and reverts to the previous quantity when the update fails", async () => {
    mockApi({ patch: () => Promise.reject(new Error("Internal server error")) });
    const view = await renderScreen();

    await waitFor(() => {
      expect(screen.getByText(/^0 de 4 un/)).toBeTruthy();
    });
    fireEvent.press(screen.getByTestId("grocery-increment-soap"));

    await waitFor(() => {
      expect(useToastStore.getState().message).toBe("Não foi possível atualizar a quantidade.");
    });
    await waitFor(() => {
      expect(screen.getByText(/^0 de 4 un/)).toBeTruthy();
    });
    await flush();
    view.unmount();
    await flush();
  });

  // Kept last — see the note at the top of the file.
  it("builds rapid taps on each other and sends them in tap order", async () => {
    mockApi({
      patch: (_path, body) =>
        Promise.resolve({ ...SOAP, currentQuantity: String(body.currentQuantity) }),
    });
    const view = await renderScreen();

    await waitFor(() => {
      expect(screen.getByText(/^0 de 4 un/)).toBeTruthy();
    });
    fireEvent.press(screen.getByTestId("grocery-increment-soap"));
    fireEvent.press(screen.getByTestId("grocery-increment-soap"));

    await waitFor(() => {
      expect(patchCalls()).toEqual([
        ["/grocery/items/soap", { currentQuantity: 1 }],
        ["/grocery/items/soap", { currentQuantity: 2 }],
      ]);
    });
    expect(screen.getByText(/^2 de 4 un/)).toBeTruthy();
    await flush();
    view.unmount();
    await flush();
  });
});
