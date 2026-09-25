import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";

import { apiFetch } from "../../lib/api-client";

import { VehicleFormScreen } from "./VehicleFormScreen";

// Own file: this test types and submits, which would break the next
// test's render in a shared file (docs/steering/tech.md).
jest.mock("expo-image-picker", () => ({ launchImageLibraryAsync: jest.fn() }));
jest.mock("../../lib/api-client", () => ({
  apiFetch: jest.fn(),
  ApiError: class ApiError extends Error {},
}));

const Stack = createNativeStackNavigator();

const VEHICLE = {
  id: "veh-1",
  make: "Jeep",
  model: "Renegade",
  displayName: "Jeep Renegade 2022",
  manufactureYear: 2021,
  modelYear: 2022,
  currentMileage: 36200,
  licensePlate: null,
  acquisitionDate: null,
  color: null,
  fuelType: null,
  photoUrl: null,
  createdAt: "2026-09-25T12:00:00.000Z",
  updatedAt: "2026-09-25T12:00:00.000Z",
};

it("shows the mileage-decrease error inline with the stored value, without calling the API", async () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, refetchOnWindowFocus: false, gcTime: 0 } },
  });
  await render(
    <QueryClientProvider client={queryClient}>
      <NavigationContainer>
        <Stack.Navigator screenOptions={{ headerShown: false, animation: "none" }}>
          <Stack.Screen
            name="VehicleForm"
            component={VehicleFormScreen}
            initialParams={{ vehicle: VEHICLE }}
          />
        </Stack.Navigator>
      </NavigationContainer>
    </QueryClientProvider>,
  );

  await waitFor(() => {
    expect(screen.getByTestId("current-mileage-input").props.value).toBe("36200");
  });
  fireEvent.changeText(screen.getByTestId("current-mileage-input"), "30000");
  await waitFor(() => {
    expect(screen.getByTestId("current-mileage-input").props.value).toBe("30000");
  });
  fireEvent.press(screen.getByTestId("submit-button"));

  await waitFor(() => {
    expect(
      screen.getByText("A quilometragem não pode ser menor que a atual (36.200 km)"),
    ).toBeTruthy();
  });
  expect(apiFetch).not.toHaveBeenCalled();
});
