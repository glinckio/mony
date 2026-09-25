import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";

import { apiFetch } from "../../lib/api-client";

import { GroceryScreen } from "./GroceryScreen";

// Budget sheet save — one submitting test per file (docs/steering/tech.md,
// RHF/TanStack gotcha). The failure case is the last test in
// GroceryScreen.test.tsx.

jest.mock("../../lib/api-client", () => ({
  apiFetch: jest.fn(),
  ApiError: class ApiError extends Error {},
}));

const mockedApiFetch = apiFetch as jest.Mock;

const Stack = createNativeStackNavigator();

// See the matching note in LoginScreen.test.tsx.
const flush = () => new Promise<void>((resolve) => setTimeout(resolve, 50));

describe("GroceryScreen budget sheet", () => {
  it("opens prefilled with the current budget and saves a new amount", async () => {
    mockedApiFetch.mockImplementation((path: string, init?: { method?: string; body?: string }) => {
      if (init?.method === "POST" && path === "/grocery/budget") {
        const { amount } = JSON.parse(init.body ?? "{}");
        return Promise.resolve({
          amount: Number(amount).toFixed(2),
          setAt: "2026-09-25T13:00:00.000Z",
        });
      }
      if (path === "/grocery/items") return Promise.resolve([]);
      if (path === "/grocery/budget") {
        return Promise.resolve({ amount: "100.00", setAt: "2026-09-25T12:00:00.000Z" });
      }
      if (path === "/grocery/summary") {
        return Promise.resolve({
          totalItemCount: 0,
          missingItemCount: 0,
          estimatedPurchaseTotal: "0.00",
        });
      }
      return Promise.reject(new Error(`unexpected ${path}`));
    });
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false, refetchOnWindowFocus: false, gcTime: 0 } },
    });
    const view = await render(
      <QueryClientProvider client={queryClient}>
        <NavigationContainer>
          <Stack.Navigator screenOptions={{ headerShown: false, animation: "none" }}>
            <Stack.Screen name="Grocery" component={GroceryScreen} />
          </Stack.Navigator>
        </NavigationContainer>
      </QueryClientProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("grocery-budget-amount")).toHaveTextContent(/R\$\s100,00/);
    });
    fireEvent.press(screen.getByTestId("edit-grocery-budget"));

    await waitFor(() => {
      expect(screen.getByTestId("grocery-budget-input").props.value).toMatch(/R\$\s100,00/);
    });
    // Cents mask: typed digits are cents.
    fireEvent.changeText(screen.getByTestId("grocery-budget-input"), "65050");
    await flush();
    fireEvent.press(screen.getByTestId("save-grocery-budget"));

    await waitFor(() => {
      expect(screen.getByTestId("grocery-budget-amount")).toHaveTextContent(/R\$\s650,50/);
    });
    const post = mockedApiFetch.mock.calls.find(([, init]) => init?.method === "POST");
    expect(post?.[0]).toBe("/grocery/budget");
    expect(JSON.parse(post?.[1].body)).toEqual({ amount: 650.5 });
    await flush();
    view.unmount();
    await flush();
  });
});
