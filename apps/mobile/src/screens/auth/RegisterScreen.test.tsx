import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";

import { RegisterScreen } from "./RegisterScreen";

const Stack = createNativeStackNavigator();

function renderScreen() {
  return render(
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false, animation: "none" }}>
        <Stack.Screen name="Register" component={RegisterScreen} />
      </Stack.Navigator>
    </NavigationContainer>,
  );
}

// See the matching note in LoginScreen.test.tsx.
const flush = () => new Promise<void>((resolve) => setTimeout(resolve, 50));

describe("RegisterScreen", () => {
  it("toggles both password fields' visibility independently", async () => {
    await renderScreen();

    expect(screen.getByTestId("password-input").props.secureTextEntry).toBe(true);
    expect(screen.getByTestId("password-confirmation-input").props.secureTextEntry).toBe(true);

    fireEvent.press(screen.getByTestId("password-input-toggle-visibility"));

    // React 19 doesn't guarantee this is flushed synchronously — see the
    // matching note in LoginScreen.test.tsx.
    await waitFor(() => {
      expect(screen.getByTestId("password-input").props.secureTextEntry).toBe(false);
    });
    expect(screen.getByTestId("password-confirmation-input").props.secureTextEntry).toBe(true);
  });

  it("shows validation errors when submitting empty fields", async () => {
    await renderScreen();

    fireEvent.press(screen.getByTestId("submit-button"));

    await waitFor(() => {
      expect(screen.getByText("Nome é obrigatório")).toBeTruthy();
      expect(screen.getByText("E-mail inválido")).toBeTruthy();
      expect(screen.getByText("Senha deve ter no mínimo 8 caracteres")).toBeTruthy();
    });
    await flush();
  });

  it("shows an error when the password confirmation doesn't match", async () => {
    await renderScreen();

    fireEvent.changeText(screen.getByTestId("name-input"), "Ada Lovelace");
    fireEvent.changeText(screen.getByTestId("email-input"), "ada@example.com");
    fireEvent.changeText(screen.getByTestId("password-input"), "correcthorsebattery");
    fireEvent.changeText(screen.getByTestId("password-confirmation-input"), "somethingElse");
    fireEvent.press(screen.getByTestId("submit-button"));

    await waitFor(() => {
      expect(screen.getByText("As senhas não coincidem")).toBeTruthy();
    });
    await flush();
  });
});
