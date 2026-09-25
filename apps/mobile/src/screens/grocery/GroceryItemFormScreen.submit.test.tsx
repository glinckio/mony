import { NavigationContainer, useNavigation } from "@react-navigation/native";
import {
  createNativeStackNavigator,
  type NativeStackNavigationProp,
} from "@react-navigation/native-stack";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import { Text, TouchableOpacity } from "react-native";

import { apiFetch } from "../../lib/api-client";

import { GroceryItemFormScreen } from "./GroceryItemFormScreen";

// One submitting test per file: after a submit, any later render() in the
// same file comes back empty — see docs/steering/tech.md (RHF/TanStack
// gotcha). Siblings: GroceryItemFormScreen.edit.test.tsx,
// GroceryItemFormScreen.submit-error.test.tsx.

jest.mock("../../lib/api-client", () => ({
  apiFetch: jest.fn(),
  ApiError: class ApiError extends Error {},
}));

const mockedApiFetch = apiFetch as jest.Mock;

type TestStack = { Home: undefined; GroceryItemForm: undefined };
const Stack = createNativeStackNavigator<TestStack>();

// A real screen underneath the form, so "saved -> goBack" is observable.
function Home() {
  const navigation = useNavigation<NativeStackNavigationProp<TestStack>>();
  return (
    <TouchableOpacity testID="open-form" onPress={() => navigation.navigate("GroceryItemForm")}>
      <Text>Lista de mercado</Text>
    </TouchableOpacity>
  );
}

// See the matching note in LoginScreen.test.tsx.
const flush = () => new Promise<void>((resolve) => setTimeout(resolve, 50));

describe("GroceryItemFormScreen create", () => {
  it("creates an item from pt-BR decimal input and closes the form", async () => {
    mockedApiFetch.mockResolvedValue({});
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false, refetchOnWindowFocus: false, gcTime: 0 } },
    });
    const view = await render(
      <QueryClientProvider client={queryClient}>
        <NavigationContainer>
          <Stack.Navigator screenOptions={{ headerShown: false, animation: "none" }}>
            <Stack.Screen name="Home" component={Home} />
            <Stack.Screen name="GroceryItemForm" component={GroceryItemFormScreen} />
          </Stack.Navigator>
        </NavigationContainer>
      </QueryClientProvider>,
    );
    await waitFor(() => {
      expect(screen.getByTestId("open-form")).toBeTruthy();
    });
    fireEvent.press(screen.getByTestId("open-form"));
    await waitFor(() => {
      expect(screen.getByTestId("submit-button")).toBeTruthy();
    });

    fireEvent.changeText(screen.getByTestId("name-input"), "Leite");
    fireEvent.changeText(screen.getByTestId("unit-input"), "l");
    fireEvent.changeText(screen.getByTestId("ideal-quantity-input"), "1,5");
    // Cents mask: "649" -> R$ 6,49.
    fireEvent.changeText(screen.getByTestId("estimated-price-input"), "649");
    fireEvent.press(screen.getByTestId("grocery-category-DAIRY_AND_DELI"));
    await flush();
    fireEvent.press(screen.getByTestId("submit-button"));

    await waitFor(() => {
      expect(screen.getByText("Lista de mercado")).toBeTruthy();
    });
    expect(mockedApiFetch).toHaveBeenCalledTimes(1);
    const [path, init] = mockedApiFetch.mock.calls[0];
    expect(path).toBe("/grocery/items");
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body)).toEqual({
      name: "Leite",
      unit: "l",
      idealQuantity: 1.5,
      currentQuantity: 0,
      estimatedPrice: 6.49,
      category: "DAIRY_AND_DELI",
    });
    await flush();
    view.unmount();
    await flush();
  });
});
