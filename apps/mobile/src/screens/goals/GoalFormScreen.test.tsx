import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";

import { apiFetch } from "../../lib/api-client";

import { GoalFormScreen } from "./GoalFormScreen";

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
          <Stack.Screen name="GoalForm" component={GoalFormScreen} initialParams={initialParams} />
        </Stack.Navigator>
      </NavigationContainer>
    </QueryClientProvider>,
  );
}

// See the matching note in LoginScreen.test.tsx.
const flush = () => new Promise<void>((resolve) => setTimeout(resolve, 50));

describe("GoalFormScreen", () => {
  beforeEach(() => {
    mockedApiFetch.mockReset();
    mockedApiFetch.mockResolvedValue([
      {
        id: "cat-1",
        name: "Viagens",
        type: "EXPENSE",
        color: "#3B82F6",
        icon: "airplane-outline",
        createdAt: "2026-01-15T12:00:00.000Z",
      },
    ]);
  });

  it("defaults to no category selected, and allows picking one", async () => {
    const view = await renderScreen();

    await waitFor(() => {
      expect(screen.getByTestId("category-option-cat-1")).toBeTruthy();
    });
    expect(screen.getByTestId("category-option-none").props.accessibilityState.selected).toBe(
      true,
    );

    fireEvent.press(screen.getByTestId("category-option-cat-1"));
    await waitFor(() => {
      expect(screen.getByTestId("category-option-cat-1").props.accessibilityState.selected).toBe(
        true,
      );
    });
    expect(screen.getByTestId("category-option-none").props.accessibilityState.selected).toBe(
      false,
    );
    view.unmount();
    await flush();
  });

  it("hides the completed toggle when creating", async () => {
    const view = await renderScreen();

    expect(screen.queryByTestId("completed-toggle")).toBeNull();
    view.unmount();
    await flush();
  });

  it("shows the completed toggle, independent of currentAmount, when editing", async () => {
    const view = await renderScreen({
      goal: {
        id: "goal-1",
        workspace: "PERSONAL",
        categoryId: null,
        title: "Viagem",
        description: null,
        targetAmount: "5000.00",
        currentAmount: "100.00",
        targetDate: null,
        completed: false,
        progressPercent: 2,
        createdAt: "2026-01-15T12:00:00.000Z",
        updatedAt: "2026-01-15T12:00:00.000Z",
      },
    });

    await waitFor(() => {
      expect(screen.getByTestId("title-input").props.value).toBe("Viagem");
    });
    expect(screen.getByTestId("completed-toggle").props.accessibilityState.selected).toBe(false);

    fireEvent.press(screen.getByTestId("completed-toggle"));
    await waitFor(() => {
      expect(screen.getByTestId("completed-toggle").props.accessibilityState.selected).toBe(true);
    });
    view.unmount();
    await flush();
  });

  it("shows validation errors when submitting empty required fields", async () => {
    const view = await renderScreen();

    fireEvent.press(screen.getByTestId("submit-button"));

    await waitFor(() => {
      expect(screen.getByText("Título é obrigatório")).toBeTruthy();
    });
    view.unmount();
    await flush();
  });

  it("rejects a non-positive targetAmount", async () => {
    const view = await renderScreen();

    fireEvent.changeText(screen.getByTestId("title-input"), "Viagem");
    fireEvent.press(screen.getByTestId("submit-button"));

    await waitFor(() => {
      expect(screen.getByText("Valor é obrigatório")).toBeTruthy();
    });
    view.unmount();
    await flush();
  });
});
