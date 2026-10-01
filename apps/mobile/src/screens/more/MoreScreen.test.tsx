import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { render, screen } from "@testing-library/react-native";

import { useAuthStore } from "../../lib/auth-store";

import { MoreScreen } from "./MoreScreen";

jest.mock("../../lib/api-client", () => ({ apiFetch: jest.fn(), logout: jest.fn() }));

const Stack = createNativeStackNavigator();

const user = { id: "u1", name: "Marina Costa", email: "marina@example.com" };

async function renderMore() {
  return render(
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false, animation: "none" }}>
        <Stack.Screen name="More" component={MoreScreen} />
      </Stack.Navigator>
    </NavigationContainer>,
  );
}

describe("MoreScreen", () => {
  it("offers Novidades to everyone, and news management to admins only", async () => {
    useAuthStore.setState({ user: { ...user, role: "USER", activeWorkspace: "PERSONAL" } });
    const asUser = await renderMore();
    expect(screen.getByTestId("more-news")).toBeTruthy();
    expect(screen.queryByTestId("more-admin-news")).toBeNull();
    await asUser.unmount();

    useAuthStore.setState({ user: { ...user, role: "ADMIN", activeWorkspace: "PERSONAL" } });
    const asAdmin = await renderMore();
    expect(screen.getByTestId("more-admin-news")).toBeTruthy();
    await asAdmin.unmount();
  });

  it("treats a session saved without a role as a regular user", async () => {
    useAuthStore.setState({ user: { ...user, activeWorkspace: "PERSONAL" } });
    const view = await renderMore();
    expect(screen.queryByTestId("more-admin-news")).toBeNull();
    await view.unmount();
  });
});
