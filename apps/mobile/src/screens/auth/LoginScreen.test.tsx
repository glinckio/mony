import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";

import { LoginScreen } from "./LoginScreen";

const Stack = createNativeStackNavigator();

function renderScreen() {
  return render(
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false, animation: "none" }}>
        <Stack.Screen name="Login" component={LoginScreen} />
      </Stack.Navigator>
    </NavigationContainer>,
  );
}

// react-hook-form's async zod validation can still have a microtask in
// flight after `waitFor`'s assertion first passes — draining the event
// loop once more before the test returns keeps that settle from leaking
// into whichever test (in this file or the next) runs after it.
const flush = () => new Promise<void>((resolve) => setTimeout(resolve, 50));

describe("LoginScreen", () => {
  it("toggles password visibility", async () => {
    await renderScreen();

    expect(screen.getByTestId("password-input").props.secureTextEntry).toBe(true);

    fireEvent.press(screen.getByTestId("password-input-toggle-visibility"));

    // React 19 doesn't guarantee this state update is flushed
    // synchronously by the time fireEvent.press returns — re-query and
    // wait instead of asserting on a props snapshot taken before the
    // press.
    await waitFor(() => {
      expect(screen.getByTestId("password-input").props.secureTextEntry).toBe(false);
    });
  });

  it("shows validation errors when submitting empty fields", async () => {
    await renderScreen();

    fireEvent.press(screen.getByTestId("submit-button"));

    await waitFor(() => {
      expect(screen.getByText("E-mail inválido")).toBeTruthy();
      expect(screen.getByText("Senha é obrigatória")).toBeTruthy();
    });
    await flush();
  });

  it("shows a validation error for a malformed email", async () => {
    await renderScreen();

    fireEvent.changeText(screen.getByTestId("email-input"), "not-an-email");
    fireEvent.changeText(screen.getByTestId("password-input"), "x");
    fireEvent.press(screen.getByTestId("submit-button"));

    await waitFor(() => {
      expect(screen.getByText("E-mail inválido")).toBeTruthy();
    });
    await flush();
  });
});
