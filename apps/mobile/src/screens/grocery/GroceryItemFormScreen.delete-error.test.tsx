import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react-native";

import { apiFetch } from "../../lib/api-client";
import { useToastStore } from "../../lib/toast-store";

import { GroceryItemFormScreen } from "./GroceryItemFormScreen";

// Own file, like the other GroceryItemFormScreen mutations — see
// GroceryItemFormScreen.submit.test.tsx.

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

describe("GroceryItemFormScreen delete failure", () => {
  // This form is an iOS modal: the app's toast would render behind it.
  it("keeps the sheet open and shows the failure inside it, not in a toast", async () => {
    let rejectDelete!: (error: unknown) => void;
    mockedApiFetch.mockImplementation(
      (_path: string, init?: { method?: string }) =>
        new Promise((_resolve, reject) => {
          if (init?.method === "DELETE") rejectDelete = reject;
          else reject(new Error("unexpected request"));
        }),
    );
    useToastStore.getState().hide();
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
      expect(screen.getByTestId("delete-grocery-item")).toBeTruthy();
    });

    await fireEvent.press(screen.getByTestId("delete-grocery-item"));
    expect(screen.getByText('Excluir "Arroz" da lista?')).toBeTruthy();
    await fireEvent.press(screen.getByTestId("confirm-sheet-confirm"));

    // While the request runs the sheet stays put.
    expect(mockedApiFetch).toHaveBeenCalledWith("/grocery/items/rice", { method: "DELETE" });
    expect(screen.getByTestId("confirm-sheet-cancel").props.accessibilityState.disabled).toBe(true);
    await fireEvent.press(
      screen.getByTestId("confirm-sheet-backdrop", { includeHiddenElements: true }),
    );
    expect(screen.getByTestId("confirm-sheet")).toBeTruthy();

    await act(async () => {
      rejectDelete(new Error("Grocery item not found"));
    });

    await waitFor(() => {
      expect(
        within(screen.getByTestId("confirm-sheet")).getByText(
          "Não foi possível excluir. Tente novamente.",
        ),
      ).toBeTruthy();
    });
    expect(useToastStore.getState().message).toBeNull();
    expect(screen.queryByText(/not found/)).toBeNull();
    // Still on the form, and the sheet can be retried or dismissed.
    expect(screen.getByTestId("name-input").props.value).toBe("Arroz");
    expect(screen.getByTestId("confirm-sheet-confirm").props.accessibilityState.disabled).toBe(
      false,
    );

    // Dismissing clears the failure for the next attempt.
    await fireEvent.press(screen.getByTestId("confirm-sheet-cancel"));
    await waitFor(() => {
      expect(screen.queryByTestId("confirm-sheet")).toBeNull();
    });
    await fireEvent.press(screen.getByTestId("delete-grocery-item"));
    expect(screen.queryByText("Não foi possível excluir. Tente novamente.")).toBeNull();

    await flush();
    view.unmount();
    await flush();
  });
});
