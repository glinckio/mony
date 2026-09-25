import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";

import { apiFetch } from "../../lib/api-client";

import { GroceryItemFormScreen } from "./GroceryItemFormScreen";

// One submitting test per file — see GroceryItemFormScreen.submit.test.tsx.

jest.mock("../../lib/api-client", () => ({
  apiFetch: jest.fn(),
  ApiError: class ApiError extends Error {},
}));

const mockedApiFetch = apiFetch as jest.Mock;

const Stack = createNativeStackNavigator();

const RICE = {
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

// See the matching note in LoginScreen.test.tsx.
const flush = () => new Promise<void>((resolve) => setTimeout(resolve, 50));

describe("GroceryItemFormScreen save failure", () => {
  it("shows generic pt-BR copy, never the API message, and stays on the form", async () => {
    mockedApiFetch.mockRejectedValue(
      new Error("name must be shorter than or equal to 100 characters"),
    );
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false, refetchOnWindowFocus: false, gcTime: 0 } },
    });
    const view = await render(
      <QueryClientProvider client={queryClient}>
        <NavigationContainer>
          <Stack.Navigator screenOptions={{ headerShown: false, animation: "none" }}>
            <Stack.Screen
              name="GroceryItemForm"
              component={GroceryItemFormScreen}
              initialParams={{ item: RICE }}
            />
          </Stack.Navigator>
        </NavigationContainer>
      </QueryClientProvider>,
    );
    await waitFor(() => {
      expect(screen.getByTestId("submit-button")).toBeTruthy();
    });
    await flush();
    fireEvent.press(screen.getByTestId("submit-button"));

    await waitFor(() => {
      expect(screen.getByText("Algo deu errado. Tente novamente.")).toBeTruthy();
    });
    expect(screen.queryByText(/must be shorter/)).toBeNull();
    expect(screen.getByTestId("name-input").props.value).toBe("Arroz");
    await flush();
    view.unmount();
    await flush();
  });
});
