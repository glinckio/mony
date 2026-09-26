import { NavigationContainer, useRoute } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import { Text } from "react-native";

import { apiFetch } from "../../lib/api-client";

import { TransactionFormScreen } from "./TransactionFormScreen";

jest.mock("../../lib/api-client", () => ({
  apiFetch: jest.fn(),
  ApiError: class ApiError extends Error {},
}));

const mockedApiFetch = apiFetch as jest.Mock;
const Stack = createNativeStackNavigator();

const RENT = {
  id: "cat-1",
  name: "Aluguel",
  type: "EXPENSE",
  color: "#3B82F6",
  icon: "home-outline",
  createdAt: "2026-01-15T12:00:00.000Z",
};

function CategoryFormStub() {
  const { params } = useRoute<{ key: string; name: string; params?: { type?: string } }>();
  return <Text>{`Nova categoria: ${params?.type ?? "sem tipo"}`}</Text>;
}

// See the matching note in LoginScreen.test.tsx.
const flush = () => new Promise<void>((resolve) => setTimeout(resolve, 50));

// An income with no income categories yet: the picker offers to create one,
// already set to income.
it("opens the category form on the type being entered", async () => {
  mockedApiFetch.mockImplementation((path: string) =>
    Promise.resolve(path === "/categories?type=EXPENSE" ? [RENT] : []),
  );
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, refetchOnWindowFocus: false, gcTime: 0 } },
  });
  const view = await render(
    <QueryClientProvider client={queryClient}>
      <NavigationContainer>
        <Stack.Navigator screenOptions={{ headerShown: false, animation: "none" }}>
          <Stack.Screen name="TransactionForm" component={TransactionFormScreen} />
          <Stack.Screen name="CategoryForm" component={CategoryFormStub} />
        </Stack.Navigator>
      </NavigationContainer>
    </QueryClientProvider>,
  );
  await waitFor(() => {
    expect(screen.getByText("Aluguel")).toBeTruthy();
  });
  // Expense categories exist: no shortcut.
  expect(screen.queryByText("Criar categoria")).toBeNull();

  await fireEvent.press(screen.getByTestId("type-option-INCOME"));
  await waitFor(() => {
    expect(screen.getByText("Criar categoria")).toBeTruthy();
  });
  await fireEvent.press(screen.getByText("Criar categoria"));

  await waitFor(() => {
    expect(screen.getByText("Nova categoria: INCOME")).toBeTruthy();
  });
  await flush();
  view.unmount();
  await flush();
});
