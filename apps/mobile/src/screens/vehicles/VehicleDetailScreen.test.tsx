import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor, within } from "@testing-library/react-native";

import { apiFetch } from "../../lib/api-client";

import { VehicleDetailScreen } from "./VehicleDetailScreen";

jest.mock("expo-image-picker", () => ({ launchImageLibraryAsync: jest.fn() }));
jest.mock("../../lib/api-client", () => ({
  apiFetch: jest.fn(),
  ApiError: class ApiError extends Error {},
}));

const mockedApiFetch = apiFetch as jest.Mock;
const Stack = createNativeStackNavigator();

const VEHICLE = {
  id: "veh-1",
  make: "Jeep",
  model: "Renegade",
  displayName: "Jeep Renegade 2022",
  manufactureYear: 2021,
  modelYear: 2022,
  currentMileage: 36200,
  licensePlate: "ABC1D23",
  acquisitionDate: "2022-03-15",
  color: null,
  fuelType: "FLEX",
  photoUrl: null,
  createdAt: "2026-09-25T12:00:00.000Z",
  updatedAt: "2026-09-25T12:00:00.000Z",
};

function renderScreen() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, refetchOnWindowFocus: false, gcTime: 0 } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <NavigationContainer>
        <Stack.Navigator screenOptions={{ headerShown: false, animation: "none" }}>
          <Stack.Screen
            name="VehicleDetail"
            component={VehicleDetailScreen}
            initialParams={{ vehicleId: "veh-1" }}
          />
        </Stack.Navigator>
      </NavigationContainer>
    </QueryClientProvider>,
  );
}

// See the matching note in LoginScreen.test.tsx.
const flush = () => new Promise<void>((resolve) => setTimeout(resolve, 50));

describe("VehicleDetailScreen", () => {
  beforeEach(() => {
    mockedApiFetch.mockReset();
  });

  it("shows the vehicle's details with pt-BR labels and a photo placeholder", async () => {
    mockedApiFetch.mockResolvedValue(VEHICLE);
    const view = await renderScreen();

    await waitFor(() => {
      expect(screen.getByTestId("vehicle-mileage")).toHaveTextContent("36.200 km");
    });
    const details = screen.getByTestId("vehicle-details");
    expect(within(details).getByText("ABC1D23")).toBeTruthy();
    expect(within(details).getByText("2021/2022")).toBeTruthy();
    expect(within(details).getByText("Flex (Gasolina/Etanol)")).toBeTruthy();
    expect(within(details).getByText("15/03/2022")).toBeTruthy();
    // No color → dash.
    expect(within(details).getByText("—")).toBeTruthy();
    expect(screen.getByText("Adicionar foto")).toBeTruthy();
    expect(screen.queryByTestId("remove-photo-button")).toBeNull();
    view.unmount();
    await flush();
  });

  it("offers to change or remove an existing photo", async () => {
    mockedApiFetch.mockResolvedValue({ ...VEHICLE, photoUrl: "http://minio/signed.jpg" });
    const view = await renderScreen();

    await waitFor(() => {
      expect(screen.getByText("Trocar foto")).toBeTruthy();
    });
    expect(screen.getByTestId("remove-photo-button")).toBeTruthy();
    expect(screen.getByTestId("vehicle-photo").props.source).toEqual({
      uri: "http://minio/signed.jpg",
    });
    view.unmount();
    await flush();
  });

  it("shows generic pt-BR copy, never the API message, when the vehicle can't be loaded", async () => {
    mockedApiFetch.mockRejectedValue(new Error("Vehicle not found."));
    const view = await renderScreen();

    await waitFor(() => {
      expect(screen.getByText("Algo deu errado. Tente novamente.")).toBeTruthy();
    });
    expect(screen.queryByText(/Vehicle not found/)).toBeNull();
    expect(screen.queryByTestId("edit-vehicle-button")).toBeNull();
    view.unmount();
    await flush();
  });
});
