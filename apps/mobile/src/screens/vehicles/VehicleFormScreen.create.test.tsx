import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import * as ImagePicker from "expo-image-picker";
import { Text } from "react-native";

import { Toast } from "../../components/ui";
import { apiFetch } from "../../lib/api-client";
import { useToastStore } from "../../lib/toast-store";

import { VehicleFormScreen } from "./VehicleFormScreen";

// Own file: this test types and submits (docs/steering/tech.md).
jest.mock("expo-image-picker", () => ({ launchImageLibraryAsync: jest.fn() }));
// Native module: the picked photo is downscaled/re-encoded before upload.
jest.mock("expo-image-manipulator", () => ({
  SaveFormat: { JPEG: "jpeg" },
  ImageManipulator: {
    manipulate: jest.fn(() => ({
      resize: jest.fn(),
      renderAsync: jest.fn(async () => ({
        saveAsync: jest.fn(async () => ({ uri: "file:///cache/car-resized.jpg" })),
      })),
    })),
  },
}));
jest.mock("../../lib/api-client", () => ({
  apiFetch: jest.fn(),
  ApiError: class ApiError extends Error {},
}));

const mockedApiFetch = apiFetch as jest.Mock;
const mockedPicker = ImagePicker.launchImageLibraryAsync as jest.Mock;
const Stack = createNativeStackNavigator();

const CREATED = {
  id: "veh-9",
  make: "Jeep",
  model: "Renegade",
  displayName: "Jeep Renegade 2022",
  manufactureYear: 2021,
  modelYear: 2022,
  currentMileage: 35000,
  licensePlate: "ABC1D23",
  acquisitionDate: null,
  color: null,
  fuelType: "FLEX",
  photoUrl: null,
  createdAt: "2026-09-25T12:00:00.000Z",
  updatedAt: "2026-09-25T12:00:00.000Z",
};

function VehiclesStub() {
  return <Text>Lista de veículos</Text>;
}

// See the matching note in LoginScreen.test.tsx.
const flush = () => new Promise<void>((resolve) => setTimeout(resolve, 50));

it("saves the vehicle even when the photo upload fails, telling the user in pt-BR", async () => {
  mockedPicker.mockResolvedValue({
    canceled: false,
    assets: [{ uri: "file:///cache/car.jpg", mimeType: "image/jpeg", width: 4000, height: 3000 }],
  });
  mockedApiFetch.mockImplementation((path: string, init?: { method?: string }) => {
    if (path === "/vehicles" && init?.method === "POST") return Promise.resolve(CREATED);
    if (path === "/vehicles/veh-9/photo" && init?.method === "PUT") {
      return Promise.reject(new Error("Photo must be a JPEG, PNG, or WebP image."));
    }
    return Promise.reject(new Error(`unexpected ${path}`));
  });
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, refetchOnWindowFocus: false, gcTime: 0 } },
  });
  const view = await render(
    <QueryClientProvider client={queryClient}>
      <NavigationContainer
        initialState={{ index: 1, routes: [{ name: "Vehicles" }, { name: "VehicleForm" }] }}
      >
        <Stack.Navigator screenOptions={{ headerShown: false, animation: "none" }}>
          <Stack.Screen name="Vehicles" component={VehiclesStub} />
          <Stack.Screen name="VehicleForm" component={VehicleFormScreen} />
        </Stack.Navigator>
      </NavigationContainer>
      <Toast />
    </QueryClientProvider>,
  );

  await waitFor(() => {
    expect(screen.getByTestId("pick-photo-button")).toBeTruthy();
  });
  fireEvent.press(screen.getByTestId("pick-photo-button"));
  await waitFor(() => {
    expect(screen.getByText("Trocar foto")).toBeTruthy();
  });

  fireEvent.changeText(screen.getByTestId("make-input"), "Jeep");
  fireEvent.changeText(screen.getByTestId("model-input"), "Renegade");
  fireEvent.changeText(screen.getByTestId("manufacture-year-input"), "2021");
  fireEvent.changeText(screen.getByTestId("model-year-input"), "2022");
  fireEvent.changeText(screen.getByTestId("current-mileage-input"), "35000");
  fireEvent.changeText(screen.getByTestId("license-plate-input"), "abc1d23");
  fireEvent.press(screen.getByTestId("fuel-type-FLEX"));
  await waitFor(() => {
    expect(screen.getByTestId("fuel-type-FLEX").props.accessibilityState.selected).toBe(true);
  });
  await flush();
  fireEvent.press(screen.getByTestId("submit-button"));

  await waitFor(() => {
    expect(
      screen.getByText(
        "Veículo salvo, mas não foi possível enviar a foto. Tente de novo na tela do veículo.",
      ),
    ).toBeTruthy();
  });
  // The form closed back to the list: the vehicle is saved either way.
  await waitFor(() => {
    expect(screen.queryByTestId("submit-button")).toBeNull();
  });
  expect(screen.getByText("Lista de veículos")).toBeTruthy();
  expect(screen.queryByText(/Photo must be/)).toBeNull();

  const post = mockedApiFetch.mock.calls.find(([, init]) => init?.method === "POST");
  expect(JSON.parse(post?.[1].body)).toEqual({
    make: "Jeep",
    model: "Renegade",
    manufactureYear: 2021,
    modelYear: 2022,
    currentMileage: 35000,
    licensePlate: "ABC1D23",
    fuelType: "FLEX",
  });
  const put = mockedApiFetch.mock.calls.find(([, init]) => init?.method === "PUT");
  expect(put?.[0]).toBe("/vehicles/veh-9/photo");
  expect(put?.[1].body).toBeInstanceOf(FormData);

  useToastStore.getState().hide();
  await flush();
  view.unmount();
  await flush();
});
