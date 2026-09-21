import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";

import { CategoryFormScreen } from "./CategoryFormScreen";

const Stack = createNativeStackNavigator();

function renderScreen(initialParams?: Record<string, unknown>) {
  return render(
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false, animation: "none" }}>
        <Stack.Screen
          name="CategoryForm"
          component={CategoryFormScreen}
          initialParams={initialParams}
        />
      </Stack.Navigator>
    </NavigationContainer>,
  );
}

// See the matching note in LoginScreen.test.tsx.
const flush = () => new Promise<void>((resolve) => setTimeout(resolve, 50));

describe("CategoryFormScreen", () => {
  it("shows validation errors when submitting without a name or icon", async () => {
    await renderScreen();

    fireEvent.press(screen.getByTestId("submit-button"));

    await waitFor(() => {
      expect(screen.getByText("Nome é obrigatório")).toBeTruthy();
      expect(screen.getByText("Ícone inválido")).toBeTruthy();
    });
    await flush();
  });

  it("defaults to the EXPENSE type with both options enabled when creating", async () => {
    await renderScreen();

    expect(screen.getByTestId("type-option-EXPENSE").props.accessibilityState.selected).toBe(
      true,
    );
    expect(screen.getByTestId("type-option-INCOME").props.accessibilityState.disabled).toBe(
      false,
    );
  });

  it("disables the type toggle and pre-fills fields when editing", async () => {
    await renderScreen({
      category: {
        id: "cat-1",
        name: "Alimentação",
        type: "EXPENSE",
        color: "#3B82F6",
        icon: "restaurant-outline",
        createdAt: "2026-01-15T12:00:00.000Z",
      },
    });

    expect(screen.getByTestId("name-input").props.value).toBe("Alimentação");
    expect(screen.getByTestId("type-option-INCOME").props.accessibilityState.disabled).toBe(true);
  });
});
