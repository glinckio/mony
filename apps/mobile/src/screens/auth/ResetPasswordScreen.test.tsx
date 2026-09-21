import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";

import { ResetPasswordScreen } from "./ResetPasswordScreen";

const Stack = createNativeStackNavigator();

function renderScreen() {
  return render(
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false, animation: "none" }}>
        <Stack.Screen name="ResetPassword" component={ResetPasswordScreen} />
      </Stack.Navigator>
    </NavigationContainer>,
  );
}

// See the matching note in LoginScreen.test.tsx.
const flush = () => new Promise<void>((resolve) => setTimeout(resolve, 50));

describe("ResetPasswordScreen", () => {
  it("toggles new-password visibility", async () => {
    await renderScreen();

    expect(screen.getByTestId("new-password-input").props.secureTextEntry).toBe(true);

    fireEvent.press(screen.getByTestId("new-password-input-toggle-visibility"));

    await waitFor(() => {
      expect(screen.getByTestId("new-password-input").props.secureTextEntry).toBe(false);
    });
  });

  it("shows validation errors for empty fields, including the 6-digit code rule", async () => {
    await renderScreen();

    fireEvent.press(screen.getByTestId("submit-button"));

    await waitFor(() => {
      expect(screen.getByText("E-mail inválido")).toBeTruthy();
      expect(screen.getByText("Código deve ter 6 dígitos")).toBeTruthy();
      expect(screen.getByText("Senha deve ter no mínimo 8 caracteres")).toBeTruthy();
    });
    await flush();
  });

  it("shows an error when the new password confirmation doesn't match", async () => {
    await renderScreen();

    fireEvent.changeText(screen.getByTestId("email-input"), "ada@example.com");
    fireEvent.changeText(screen.getByTestId("code-input"), "123456");
    fireEvent.changeText(screen.getByTestId("new-password-input"), "correcthorsebattery");
    fireEvent.changeText(screen.getByTestId("new-password-confirmation-input"), "somethingElse");
    fireEvent.press(screen.getByTestId("submit-button"));

    await waitFor(() => {
      expect(screen.getByText("As senhas não coincidem")).toBeTruthy();
    });
    await flush();
  });
});
