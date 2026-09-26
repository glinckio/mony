import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import { Text } from "react-native";

import { apiFetch } from "../../lib/api-client";
import { queryClient } from "../../lib/query-client";

import { CategoryFormScreen } from "./CategoryFormScreen";

// Own file: this test submits (docs/steering/tech.md, RHF/TanStack gotcha).

jest.mock("../../lib/api-client", () => ({
  apiFetch: jest.fn(),
  ApiError: class ApiError extends Error {},
}));

const mockedApiFetch = apiFetch as jest.Mock;
const Stack = createNativeStackNavigator();

const INCOME_CATEGORIES_KEY = ["categories", "INCOME"];
const TRANSACTIONS_KEY = ["transactions", { typeFilter: "ALL", search: "" }];

function TransactionFormStub() {
  return <Text>Novo lançamento</Text>;
}

// See the matching note in LoginScreen.test.tsx.
const flush = () => new Promise<void>((resolve) => setTimeout(resolve, 50));

afterAll(() => {
  queryClient.clear();
});

it("creates the category and refreshes every category list in the app cache", async () => {
  mockedApiFetch.mockResolvedValue({ id: "cat-9" });
  // What the transaction form underneath (and the list's badges) cached.
  queryClient.setQueryData(INCOME_CATEGORIES_KEY, []);
  queryClient.setQueryData(["categories"], []);
  queryClient.setQueryData(TRANSACTIONS_KEY, { pages: [] });

  const view = await render(
    <NavigationContainer
      initialState={{
        index: 1,
        routes: [{ name: "TransactionForm" }, { name: "CategoryForm", params: { type: "INCOME" } }],
      }}
    >
      <Stack.Navigator screenOptions={{ headerShown: false, animation: "none" }}>
        <Stack.Screen name="TransactionForm" component={TransactionFormStub} />
        <Stack.Screen name="CategoryForm" component={CategoryFormScreen} />
      </Stack.Navigator>
    </NavigationContainer>,
  );
  await waitFor(() => {
    expect(screen.getByTestId("submit-button")).toBeTruthy();
  });

  await fireEvent.changeText(screen.getByTestId("name-input"), "Freelas");
  await fireEvent.press(screen.getByLabelText("Cor Verde"));
  await fireEvent.press(screen.getByLabelText("Ícone Trabalho"));
  await flush();
  await fireEvent.press(screen.getByTestId("submit-button"));

  await waitFor(() => {
    expect(screen.getByText("Novo lançamento")).toBeTruthy();
  });
  expect(mockedApiFetch).toHaveBeenCalledTimes(1);
  const [path, init] = mockedApiFetch.mock.calls[0];
  expect(path).toBe("/categories");
  expect(init.method).toBe("POST");
  expect(JSON.parse(init.body)).toEqual({
    name: "Freelas",
    type: "INCOME",
    color: "#10B981",
    icon: "briefcase-outline",
  });
  // The ["categories"] prefix covers the form's per-type picker too.
  expect(queryClient.getQueryState(INCOME_CATEGORIES_KEY)?.isInvalidated).toBe(true);
  expect(queryClient.getQueryState(["categories"])?.isInvalidated).toBe(true);
  expect(queryClient.getQueryState(TRANSACTIONS_KEY)?.isInvalidated).toBe(false);

  await flush();
  view.unmount();
  await flush();
});
