import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";

import { apiFetch } from "../../lib/api-client";

import { GroceryItemFormScreen } from "./GroceryItemFormScreen";

jest.mock("../../lib/api-client", () => ({
  apiFetch: jest.fn(),
  ApiError: class ApiError extends Error {},
}));

const Stack = createNativeStackNavigator();

const ITEM = {
  id: "rice",
  name: "Arroz",
  unit: "kg",
  idealQuantity: "5.00",
  currentQuantity: "1.50",
  estimatedPrice: "6.49",
  category: "PANTRY",
  missing: true,
  createdAt: "2026-09-25T12:00:00.000Z",
  updatedAt: "2026-09-25T12:00:00.000Z",
};

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
            name="GroceryItemForm"
            component={GroceryItemFormScreen}
            initialParams={initialParams}
          />
        </Stack.Navigator>
      </NavigationContainer>
    </QueryClientProvider>,
  );
}

// See the matching note in LoginScreen.test.tsx.
const flush = () => new Promise<void>((resolve) => setTimeout(resolve, 50));

describe("GroceryItemFormScreen", () => {
  beforeEach(() => {
    (apiFetch as jest.Mock).mockReset();
  });

  it("offers the 12 legacy categories and no delete button when creating", async () => {
    const view = await renderScreen();

    await waitFor(() => {
      expect(screen.getByTestId("grocery-category-picker")).toBeTruthy();
    });
    expect(screen.getByText("Frios e Laticínios")).toBeTruthy();
    expect(screen.getByText("Utilidades Domésticas")).toBeTruthy();
    expect(screen.queryByTestId("delete-grocery-item")).toBeNull();
    expect(screen.getByTestId("current-quantity-input").props.value).toBe("0");
    view.unmount();
    await flush();
  });

  it("prefills an item being edited, with pt-BR decimals, and offers delete", async () => {
    const view = await renderScreen({ item: ITEM });

    await waitFor(() => {
      expect(screen.getByTestId("name-input").props.value).toBe("Arroz");
    });
    expect(screen.getByTestId("ideal-quantity-input").props.value).toBe("5");
    expect(screen.getByTestId("current-quantity-input").props.value).toBe("1,5");
    expect(screen.getByTestId("grocery-category-PANTRY").props.accessibilityState.selected).toBe(
      true,
    );
    expect(screen.getByTestId("delete-grocery-item")).toBeTruthy();
    view.unmount();
    await flush();
  });

  // Kept last: it submits (see docs/steering/tech.md, RHF/TanStack gotcha).
  it("shows pt-BR validation errors when submitting an empty form", async () => {
    const view = await renderScreen();

    await waitFor(() => {
      expect(screen.getByTestId("submit-button")).toBeTruthy();
    });
    // Let the previous test's unmount settle before submitting.
    await flush();
    fireEvent.press(screen.getByTestId("submit-button"));

    await waitFor(() => {
      expect(screen.getByText("Nome é obrigatório")).toBeTruthy();
    });
    expect(screen.getByText("Unidade é obrigatória")).toBeTruthy();
    expect(screen.getByText("Quantidade ideal é obrigatória")).toBeTruthy();
    expect(screen.getByText("Categoria é obrigatória")).toBeTruthy();
    expect(apiFetch).not.toHaveBeenCalled();
    await flush();
    view.unmount();
    await flush();
  });
});
