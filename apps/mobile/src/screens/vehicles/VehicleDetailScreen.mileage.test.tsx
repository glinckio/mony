import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";

import { apiFetch } from "../../lib/api-client";

import { VehicleDetailScreen } from "./VehicleDetailScreen";

// "Atualizar quilometragem" sheet — submits, so it lives in its own file
// (docs/steering/tech.md, RHF/TanStack gotcha). API-failure mapping is in
// VehicleDetailScreen.mileage-errors.test.tsx.
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
  licensePlate: null,
  acquisitionDate: null,
  color: null,
  fuelType: null,
  photoUrl: null,
  createdAt: "2026-09-25T12:00:00.000Z",
  updatedAt: "2026-09-25T12:00:00.000Z",
};

// See the matching note in LoginScreen.test.tsx.
const flush = () => new Promise<void>((resolve) => setTimeout(resolve, 50));

it("refuses a lower mileage inline without calling the API, then saves a higher one", async () => {
  let stored = { ...VEHICLE };
  mockedApiFetch.mockImplementation((path: string, init?: { method?: string; body?: string }) => {
    if (path === "/vehicles/veh-1" && init?.method === "PATCH") {
      stored = { ...stored, ...JSON.parse(init.body ?? "{}") };
      return Promise.resolve(stored);
    }
    if (path === "/vehicles/veh-1") return Promise.resolve(stored);
    // The maintenance card (no types yet) isn't under test here.
    if (path === "/vehicles/veh-1/maintenance-alerts") return Promise.resolve([]);
    return Promise.reject(new Error(`unexpected ${path}`));
  });
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, refetchOnWindowFocus: false, gcTime: 0 } },
  });
  const view = await render(
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

  await waitFor(() => {
    expect(screen.getByTestId("vehicle-mileage")).toHaveTextContent("36.200 km");
  });
  fireEvent.press(screen.getByTestId("update-mileage-button"));
  await waitFor(() => {
    expect(screen.getByTestId("mileage-input").props.value).toBe("36200");
  });
  expect(screen.getByText("Atual: 36.200 km")).toBeTruthy();

  fireEvent.changeText(screen.getByTestId("mileage-input"), "30000");
  await waitFor(() => {
    expect(screen.getByTestId("mileage-input").props.value).toBe("30000");
  });
  await flush();
  fireEvent.press(screen.getByTestId("save-mileage-button"));

  await waitFor(() => {
    expect(
      screen.getByText("A quilometragem não pode ser menor que a atual (36.200 km)"),
    ).toBeTruthy();
  });
  expect(mockedApiFetch.mock.calls.some(([, init]) => init?.method === "PATCH")).toBe(false);

  fireEvent.changeText(screen.getByTestId("mileage-input"), "37.000");
  await waitFor(() => {
    expect(screen.getByTestId("mileage-input").props.value).toBe("37000");
  });
  await flush();
  fireEvent.press(screen.getByTestId("save-mileage-button"));

  await waitFor(() => {
    expect(screen.getByTestId("vehicle-mileage")).toHaveTextContent("37.000 km");
  });
  // The sheet closes with a short exit animation before unmounting.
  await waitFor(() => {
    expect(screen.queryByTestId("mileage-input")).toBeNull();
  });
  const patch = mockedApiFetch.mock.calls.find(([, init]) => init?.method === "PATCH");
  expect(patch?.[0]).toBe("/vehicles/veh-1");
  expect(JSON.parse(patch?.[1].body)).toEqual({ currentMileage: 37000 });
  await flush();
  view.unmount();
  await flush();
});
