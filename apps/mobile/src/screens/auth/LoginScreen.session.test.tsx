import type { AuthTokens } from "@mony/shared-types";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";

import { apiFetch } from "../../lib/api-client";
import { useAuthStore } from "../../lib/auth-store";

import { LoginScreen } from "./LoginScreen";

jest.mock("../../lib/api-client", () => ({
  apiFetch: jest.fn(),
  ApiError: class ApiError extends Error {},
}));

const mockedApiFetch = apiFetch as jest.Mock;
const Stack = createNativeStackNavigator();

const tokens = (userId: string): AuthTokens => ({
  accessToken: `access-${userId}`,
  refreshToken: `refresh-${userId}`,
  user: { id: userId, name: "Ada Lovelace", email: "ada@example.com", activeWorkspace: "PERSONAL" },
});

// See the matching note in LoginScreen.test.tsx.
const flush = () => new Promise<void>((resolve) => setTimeout(resolve, 50));

async function signIn() {
  const view = await render(
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false, animation: "none" }}>
        <Stack.Screen name="Login" component={LoginScreen} />
      </Stack.Navigator>
    </NavigationContainer>,
  );
  await fireEvent.changeText(screen.getByTestId("email-input"), "ada@example.com");
  await fireEvent.changeText(screen.getByTestId("password-input"), "correcthorsebattery");
  await flush();
  await fireEvent.press(screen.getByTestId("submit-button"));
  await waitFor(() => {
    expect(mockedApiFetch).toHaveBeenCalledWith("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email: "ada@example.com", password: "correcthorsebattery" }),
    });
  });
  await flush();
  view.unmount();
  await flush();
}

describe("LoginScreen session", () => {
  beforeEach(() => {
    mockedApiFetch.mockReset();
    mockedApiFetch.mockResolvedValue(tokens("user-2"));
    useAuthStore.getState().clearSession();
  });

  afterAll(() => {
    useAuthStore.getState().clearSession();
  });

  it("opens the session it gets back", async () => {
    await signIn();

    expect(useAuthStore.getState().accessToken).toBe("access-user-2");
    expect(useAuthStore.getState().user?.id).toBe("user-2");
  });

  // Only reachable from the dev catalog's preview of this screen.
  it("never replaces a session that is already open", async () => {
    useAuthStore.getState().setSession(tokens("user-1"));

    await signIn();

    expect(useAuthStore.getState().accessToken).toBe("access-user-1");
    expect(useAuthStore.getState().user?.id).toBe("user-1");
  });
});
