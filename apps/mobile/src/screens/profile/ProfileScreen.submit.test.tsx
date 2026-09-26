import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";

import { apiFetch } from "../../lib/api-client";
import { useAuthStore } from "../../lib/auth-store";

import { ProfileScreen } from "./ProfileScreen";

// Own file: this test submits (docs/steering/tech.md, RHF/TanStack gotcha).

jest.mock("../../lib/api-client", () => ({
  apiFetch: jest.fn(),
  ApiError: class ApiError extends Error {},
}));

const mockedApiFetch = apiFetch as jest.Mock;
const Stack = createNativeStackNavigator();

const PROFILE = {
  id: "user-1",
  name: "Ada Lovelace",
  email: "ada@example.com",
  phone: null,
  phone2: null,
  activeWorkspace: "PERSONAL",
  createdAt: "2026-01-15T12:00:00.000Z",
  lastAccessAt: null,
};

// See the matching note in LoginScreen.test.tsx.
const flush = () => new Promise<void>((resolve) => setTimeout(resolve, 50));

afterAll(() => {
  useAuthStore.getState().clearSession();
});

// Início and Mais greet the user from the session's copy of the profile.
it("updates the signed-in user's name and email in the session after saving", async () => {
  useAuthStore.getState().setSession({
    accessToken: "access-1",
    refreshToken: "refresh-1",
    user: {
      id: "user-1",
      name: "Ada Lovelace",
      email: "ada@example.com",
      activeWorkspace: "BUSINESS",
    },
  });
  mockedApiFetch.mockImplementation((path: string, init?: { method?: string; body?: string }) => {
    if (path !== "/users/me") return Promise.reject(new Error(`unexpected ${path}`));
    if (init?.method === "PATCH") {
      return Promise.resolve({ ...PROFILE, ...JSON.parse(init.body ?? "{}") });
    }
    return Promise.resolve(PROFILE);
  });
  const view = await render(
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false, animation: "none" }}>
        <Stack.Screen name="Profile" component={ProfileScreen} />
      </Stack.Navigator>
    </NavigationContainer>,
  );
  await waitFor(() => {
    expect(screen.getByTestId("name-input").props.value).toBe("Ada Lovelace");
  });

  await fireEvent.changeText(screen.getByTestId("name-input"), "Ada King");
  await fireEvent.changeText(screen.getByTestId("email-input"), "ada.king@example.com");
  await flush();
  await fireEvent.press(screen.getByTestId("submit-button"));

  await waitFor(() => {
    expect(screen.getByText("Perfil atualizado com sucesso.")).toBeTruthy();
  });
  expect(useAuthStore.getState().user).toEqual({
    id: "user-1",
    name: "Ada King",
    email: "ada.king@example.com",
    activeWorkspace: "BUSINESS",
  });
  // Same session: tokens untouched.
  expect(useAuthStore.getState().accessToken).toBe("access-1");

  await flush();
  view.unmount();
  await flush();
});
