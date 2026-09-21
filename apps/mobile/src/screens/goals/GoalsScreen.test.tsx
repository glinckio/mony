import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react-native";

import { apiFetch } from "../../lib/api-client";

import { GoalsScreen } from "./GoalsScreen";

jest.mock("../../lib/api-client", () => ({
  apiFetch: jest.fn(),
  ApiError: class ApiError extends Error {
    statusCode: number;
    body: unknown;
    constructor(statusCode: number, body: unknown) {
      super("api error");
      this.statusCode = statusCode;
      this.body = body;
    }
  },
}));

const mockedApiFetch = apiFetch as jest.Mock;

const Stack = createNativeStackNavigator();

function renderScreen() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, refetchOnWindowFocus: false, gcTime: 0 },
    },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <NavigationContainer>
        <Stack.Navigator screenOptions={{ headerShown: false, animation: "none" }}>
          <Stack.Screen name="Goals" component={GoalsScreen} />
        </Stack.Navigator>
      </NavigationContainer>
    </QueryClientProvider>,
  );
}

// See the matching note in LoginScreen.test.tsx.
const flush = () => new Promise<void>((resolve) => setTimeout(resolve, 50));

describe("GoalsScreen", () => {
  it("shows an overdue badge only for an incomplete goal with a past targetDate", async () => {
    mockedApiFetch.mockResolvedValue([
      {
        id: "goal-overdue",
        workspace: "PERSONAL",
        categoryId: null,
        title: "Atrasada",
        description: null,
        targetAmount: "1000.00",
        currentAmount: "0.00",
        targetDate: "2020-01-01",
        completed: false,
        progressPercent: 0,
        createdAt: "2026-01-15T12:00:00.000Z",
        updatedAt: "2026-01-15T12:00:00.000Z",
      },
      {
        id: "goal-future",
        workspace: "PERSONAL",
        categoryId: null,
        title: "No prazo",
        description: null,
        targetAmount: "1000.00",
        currentAmount: "0.00",
        targetDate: "2099-01-01",
        completed: false,
        progressPercent: 0,
        createdAt: "2026-01-15T12:00:00.000Z",
        updatedAt: "2026-01-15T12:00:00.000Z",
      },
      {
        id: "goal-overdue-but-completed",
        workspace: "PERSONAL",
        categoryId: null,
        title: "Atrasada mas concluída",
        description: null,
        targetAmount: "1000.00",
        currentAmount: "1000.00",
        targetDate: "2020-01-01",
        completed: true,
        progressPercent: 100,
        createdAt: "2026-01-15T12:00:00.000Z",
        updatedAt: "2026-01-15T12:00:00.000Z",
      },
    ]);

    const view = await renderScreen();

    await waitFor(() => {
      expect(screen.getByTestId("overdue-badge-goal-overdue")).toBeTruthy();
    });
    expect(screen.queryByTestId("overdue-badge-goal-future")).toBeNull();
    expect(screen.queryByTestId("overdue-badge-goal-overdue-but-completed")).toBeNull();
    view.unmount();
    await flush();
  });
});
