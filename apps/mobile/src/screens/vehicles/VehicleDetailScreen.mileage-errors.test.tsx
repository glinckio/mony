import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";

import { ApiError, apiFetch } from "../../lib/api-client";

import { VehicleDetailScreen } from "./VehicleDetailScreen";

// Mileage sheet API failures — submits, so own file (docs/steering/tech.md).
jest.mock("expo-image-picker", () => ({ launchImageLibraryAsync: jest.fn() }));
jest.mock("../../lib/api-client", () => ({
  apiFetch: jest.fn(),
  ApiError: class ApiError extends Error {
    statusCode: number;
    body: unknown;
    constructor(statusCode: number, body: { message: string[] }) {
      super(body.message.join(" "));
      this.statusCode = statusCode;
      this.body = body;
    }
  },
}));

const mockedApiFetch = apiFetch as jest.Mock;
const MockedApiError = ApiError as unknown as new (
  statusCode: number,
  body: { message: string[] },
) => Error;
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

it("maps failures to pt-BR copy, never the API message, and refreshes the stored value on a mileage conflict", async () => {
  let stored = { ...VEHICLE };
  let patchError: Error = new MockedApiError(500, { message: ["Internal server error"] });
  mockedApiFetch.mockImplementation((path: string, init?: { method?: string }) => {
    if (path === "/vehicles/veh-1" && init?.method === "PATCH") return Promise.reject(patchError);
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
  fireEvent.changeText(screen.getByTestId("mileage-input"), "38000");
  await waitFor(() => {
    expect(screen.getByTestId("mileage-input").props.value).toBe("38000");
  });
  await flush();

  // Unexpected failure: generic copy, never the API's English message.
  fireEvent.press(screen.getByTestId("save-mileage-button"));
  await waitFor(() => {
    expect(screen.getByText("Algo deu errado. Tente novamente.")).toBeTruthy();
  });
  expect(screen.queryByText(/Internal server error/)).toBeNull();
  await flush();

  // Someone raised the mileage to 40.000 meanwhile: the API says 400 and
  // the sheet refetches, showing the stored value.
  stored = { ...VEHICLE, currentMileage: 40000 };
  patchError = new MockedApiError(400, {
    message: ["New mileage cannot be lower than the current value (40000 km)."],
  });
  fireEvent.press(screen.getByTestId("save-mileage-button"));

  await waitFor(() => {
    expect(screen.getByText("Atual: 40.000 km")).toBeTruthy();
  });
  await flush();
  expect(screen.getByTestId("update-mileage-sheet")).toBeTruthy();
  // The inline error survives the refreshed vehicle (the sheet only
  // re-seeds when it opens) and shows the stored value, per design.md.
  expect(
    screen.getByText("A quilometragem não pode ser menor que a atual (40.000 km)"),
  ).toBeTruthy();
  expect(screen.getByTestId("mileage-input").props.value).toBe("38000");
  expect(screen.queryByText(/New mileage cannot be lower/)).toBeNull();
  expect(screen.queryByText("Algo deu errado. Tente novamente.")).toBeNull();
  await flush();
  view.unmount();
  await flush();
});
