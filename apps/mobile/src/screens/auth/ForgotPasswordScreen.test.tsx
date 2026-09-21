import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";

import { ForgotPasswordScreen } from "./ForgotPasswordScreen";

const Stack = createNativeStackNavigator();

function renderScreen() {
  return render(
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false, animation: "none" }}>
        <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
      </Stack.Navigator>
    </NavigationContainer>,
  );
}

// See the matching note in LoginScreen.test.tsx.
const flush = () => new Promise<void>((resolve) => setTimeout(resolve, 50));

describe("ForgotPasswordScreen", () => {
  it("shows a validation error when submitting an empty email", async () => {
    await renderScreen();

    fireEvent.press(screen.getByTestId("submit-button"));

    await waitFor(() => {
      expect(screen.getByText("E-mail inválido")).toBeTruthy();
    });
    await flush();
  });

  it("shows a validation error for a malformed email", async () => {
    await renderScreen();

    fireEvent.changeText(screen.getByTestId("email-input"), "not-an-email");
    fireEvent.press(screen.getByTestId("submit-button"));

    await waitFor(() => {
      expect(screen.getByText("E-mail inválido")).toBeTruthy();
    });
    await flush();
  });
});
