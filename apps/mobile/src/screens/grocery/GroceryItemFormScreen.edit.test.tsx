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

// One submitting test per file — see GroceryItemFormScreen.submit.test.tsx.

jest.mock("../../lib/api-client", () => ({
  apiFetch: jest.fn(),
  ApiError: class ApiError extends Error {},
}));

const mockedApiFetch = apiFetch as jest.Mock;

const RICE = {
  id: "rice",
  name: "Arroz",
  unit: "kg",
  idealQuantity: "5.00",
  currentQuantity: "1.50",
  estimatedPrice: "6.49",
  category: "PANTRY" as const,
  missing: true,
  createdAt: "2026-09-25T12:00:00.000Z",
  updatedAt: "2026-09-25T12:00:00.000Z",
};

type TestStack = { Home: undefined; GroceryItemForm: { item: typeof RICE } };
const Stack = createNativeStackNavigator<TestStack>();

// A real screen underneath the form, so "saved -> goBack" is observable.
function Home() {
  const navigation = useNavigation<NativeStackNavigationProp<TestStack>>();
  return (
    <TouchableOpacity
      testID="open-form"
      onPress={() => navigation.navigate("GroceryItemForm", { item: RICE })}
    >
      <Text>Lista de mercado</Text>
    </TouchableOpacity>
  );
}

// See the matching note in LoginScreen.test.tsx.
const flush = () => new Promise<void>((resolve) => setTimeout(resolve, 50));

describe("GroceryItemFormScreen edit", () => {
  it("saves changes to the item being edited with PATCH and closes the form", async () => {
    mockedApiFetch.mockResolvedValue({ ...RICE, currentQuantity: "3.00" });
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
      expect(screen.getByTestId("current-quantity-input").props.value).toBe("1,5");
    });

    fireEvent.changeText(screen.getByTestId("current-quantity-input"), "3");
    await flush();
    fireEvent.press(screen.getByTestId("submit-button"));

    await waitFor(() => {
      expect(screen.getByText("Lista de mercado")).toBeTruthy();
    });
    expect(mockedApiFetch).toHaveBeenCalledTimes(1);
    const [path, init] = mockedApiFetch.mock.calls[0];
    expect(path).toBe("/grocery/items/rice");
    expect(init.method).toBe("PATCH");
    expect(JSON.parse(init.body)).toEqual({
      name: "Arroz",
      unit: "kg",
      idealQuantity: 5,
      currentQuantity: 3,
      estimatedPrice: 6.49,
      category: "PANTRY",
    });
    await flush();
    view.unmount();
    await flush();
  });
});
