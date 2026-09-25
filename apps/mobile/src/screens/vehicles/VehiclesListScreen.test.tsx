import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react-native";

import { apiFetch } from "../../lib/api-client";

import { VehiclesListScreen } from "./VehiclesListScreen";

jest.mock("../../lib/api-client", () => ({
  apiFetch: jest.fn(),
  ApiError: class ApiError extends Error {},
}));

const mockedApiFetch = apiFetch as jest.Mock;
const Stack = createNativeStackNavigator();

function renderScreen() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, refetchOnWindowFocus: false, gcTime: 0 } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <NavigationContainer>
        <Stack.Navigator screenOptions={{ headerShown: false, animation: "none" }}>
          <Stack.Screen name="Vehicles" component={VehiclesListScreen} />
        </Stack.Navigator>
      </NavigationContainer>
    </QueryClientProvider>,
  );
}

// See the matching note in LoginScreen.test.tsx.
const flush = () => new Promise<void>((resolve) => setTimeout(resolve, 50));

describe("VehiclesListScreen", () => {
  it("lists each vehicle's display name, plate and mileage", async () => {
    mockedApiFetch.mockResolvedValue([
      {
        id: "veh-1",
        displayName: "Jeep Renegade 2022",
        licensePlate: "ABC1D23",
        currentMileage: 36200,
        photoUrl: null,
      },
      {
        id: "veh-2",
        displayName: "Honda Biz 2019",
        licensePlate: null,
        currentMileage: 12000,
        photoUrl: null,
      },
    ]);
    const view = await renderScreen();

    await waitFor(() => {
      expect(screen.getByText("Jeep Renegade 2022")).toBeTruthy();
    });
    expect(screen.getByText("ABC1D23 · 36.200 km")).toBeTruthy();
    expect(screen.getByText("12.000 km")).toBeTruthy();
    view.unmount();
    await flush();
  });

  it("shows an empty state", async () => {
    mockedApiFetch.mockResolvedValue([]);
    const view = await renderScreen();

    await waitFor(() => {
      expect(screen.getByText("Nenhum veículo ainda.")).toBeTruthy();
    });
    view.unmount();
    await flush();
  });
});
