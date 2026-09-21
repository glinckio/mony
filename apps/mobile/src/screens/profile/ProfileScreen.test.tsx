import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";

import { apiFetch } from "../../lib/api-client";

import { ProfileScreen } from "./ProfileScreen";

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
  return render(
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false, animation: "none" }}>
        <Stack.Screen name="Profile" component={ProfileScreen} />
      </Stack.Navigator>
    </NavigationContainer>,
  );
}

// See the matching note in LoginScreen.test.tsx.
const flush = () => new Promise<void>((resolve) => setTimeout(resolve, 50));

describe("ProfileScreen", () => {
  beforeEach(() => {
    mockedApiFetch.mockReset();
    mockedApiFetch.mockResolvedValue({
      id: "user-1",
      name: "Ada Lovelace",
      email: "ada@example.com",
      phone: null,
      phone2: null,
      activeWorkspace: "PERSONAL",
      createdAt: "2026-01-15T12:00:00.000Z",
      lastAccessAt: null,
    });
  });

  it("loads the profile into the form", async () => {
    await renderScreen();

    await waitFor(() => {
      expect(screen.getByTestId("name-input").props.value).toBe("Ada Lovelace");
      expect(screen.getByTestId("email-input").props.value).toBe("ada@example.com");
    });
    await flush();
  });

  it("shows validation errors for a malformed email and phone", async () => {
    await renderScreen();
    await waitFor(() => {
      expect(screen.getByTestId("email-input").props.value).toBe("ada@example.com");
    });

    fireEvent.changeText(screen.getByTestId("email-input"), "not-an-email");
    fireEvent.changeText(screen.getByTestId("phone-input"), "123");
    fireEvent.press(screen.getByTestId("submit-button"));

    await waitFor(() => {
      expect(screen.getByText("E-mail inválido")).toBeTruthy();
      expect(screen.getByText("Telefone deve ter 10 ou 11 dígitos")).toBeTruthy();
    });
    await flush();
  });
});
