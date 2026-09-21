import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";

import { ChangePasswordScreen } from "./ChangePasswordScreen";

const Stack = createNativeStackNavigator();

function renderScreen() {
  return render(
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false, animation: "none" }}>
        <Stack.Screen name="ChangePassword" component={ChangePasswordScreen} />
      </Stack.Navigator>
    </NavigationContainer>,
  );
}

// See the matching note in LoginScreen.test.tsx.
const flush = () => new Promise<void>((resolve) => setTimeout(resolve, 50));

describe("ChangePasswordScreen", () => {
  it("shows validation errors when submitting empty fields", async () => {
    await renderScreen();

    fireEvent.press(screen.getByTestId("submit-button"));

    await waitFor(() => {
      expect(screen.getByText("Senha atual é obrigatória")).toBeTruthy();
      expect(screen.getByText("Senha deve ter no mínimo 8 caracteres")).toBeTruthy();
    });
    await flush();
  });

  it("shows a validation error when the confirmation doesn't match", async () => {
    await renderScreen();

    fireEvent.changeText(screen.getByTestId("current-password-input"), "correcthorsebattery");
    fireEvent.changeText(screen.getByTestId("new-password-input"), "new-correct-horse");
    fireEvent.changeText(screen.getByTestId("new-password-confirmation-input"), "somethingElse");
    fireEvent.press(screen.getByTestId("submit-button"));

    await waitFor(() => {
      expect(screen.getByText("As senhas não coincidem")).toBeTruthy();
    });
    await flush();
  });
});
