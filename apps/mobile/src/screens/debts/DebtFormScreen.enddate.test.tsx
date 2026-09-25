import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";

import { apiFetch } from "../../lib/api-client";

import { DebtFormScreen } from "./DebtFormScreen";

// Own file: this test types and submits, which would break the next
// test's render in a shared file (docs/steering/tech.md).
jest.mock("../../lib/api-client", () => ({
  apiFetch: jest.fn(),
  ApiError: class ApiError extends Error {},
}));

const mockedApiFetch = apiFetch as jest.Mock;
const Stack = createNativeStackNavigator();

const DEBT = {
  id: "debt-1",
  workspace: "PERSONAL",
  categoryId: null,
  name: "Carro",
  totalAmount: "12000.00",
  paidAmount: "0.00",
  remainingAmount: "12000.00",
  startDate: "2026-01-10",
  endDate: "2026-12-10",
  interestRate: null,
  totalInstallments: 12,
  paidInstallments: 0,
  notes: null,
  status: "ACTIVE",
  createdAt: "2026-01-10T12:00:00.000Z",
  updatedAt: "2026-01-10T12:00:00.000Z",
};

it("flags a half-typed end date instead of silently clearing the stored one", async () => {
  mockedApiFetch.mockResolvedValue([
    {
      id: "cat-1",
      name: "Financiamentos",
      type: "EXPENSE",
      color: "#3B82F6",
      icon: "car-outline",
      createdAt: "2026-01-15T12:00:00.000Z",
    },
  ]);
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, refetchOnWindowFocus: false, gcTime: 0 } },
  });
  await render(
    <QueryClientProvider client={queryClient}>
      <NavigationContainer>
        <Stack.Navigator screenOptions={{ headerShown: false, animation: "none" }}>
          <Stack.Screen name="DebtForm" component={DebtFormScreen} initialParams={{ debt: DEBT }} />
        </Stack.Navigator>
      </NavigationContainer>
    </QueryClientProvider>,
  );

  await waitFor(() => {
    expect(screen.getByTestId("end-date-input").props.value).toBe("10/12/2026");
  });
  fireEvent.changeText(screen.getByTestId("end-date-input"), "10/12/20");
  await waitFor(() => {
    expect(screen.getByTestId("end-date-input").props.value).toBe("10/12/20");
  });
  fireEvent.press(screen.getByTestId("submit-button"));

  await waitFor(() => {
    expect(screen.getByText("Data inválida")).toBeTruthy();
  });
  // Only the categories GET — no PATCH that would have nulled endDate.
  expect(mockedApiFetch).not.toHaveBeenCalledWith(
    "/debts/debt-1",
    expect.objectContaining({ method: "PATCH" }),
  );
});
