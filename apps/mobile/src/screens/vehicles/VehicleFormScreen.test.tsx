import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";

import { apiFetch } from "../../lib/api-client";

import { VehicleFormScreen } from "./VehicleFormScreen";

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
  licensePlate: "ABC1D23",
  acquisitionDate: null,
  color: "Prata",
  fuelType: "FLEX",
  photoUrl: null,
  createdAt: "2026-09-25T12:00:00.000Z",
  updatedAt: "2026-09-25T12:00:00.000Z",
};

function renderScreen(initialParams?: Record<string, unknown>) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, refetchOnWindowFocus: false, gcTime: 0 } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <NavigationContainer>
        <Stack.Navigator screenOptions={{ headerShown: false, animation: "none" }}>
          <Stack.Screen
            name="VehicleForm"
            component={VehicleFormScreen}
            initialParams={initialParams}
          />
        </Stack.Navigator>
      </NavigationContainer>
    </QueryClientProvider>,
  );
}

// See the matching note in LoginScreen.test.tsx.
const flush = () => new Promise<void>((resolve) => setTimeout(resolve, 50));

describe("VehicleFormScreen", () => {
  beforeEach(() => {
    (apiFetch as jest.Mock).mockReset();
  });

  it("offers a photo and legacy's 8 fuel types when creating", async () => {
    const view = await renderScreen();

    await waitFor(() => {
      expect(screen.getByTestId("pick-photo-button")).toBeTruthy();
    });
    expect(screen.getByText("GNV (Gás Natural)")).toBeTruthy();
    expect(screen.getByText("Elétrico")).toBeTruthy();
    view.unmount();
    await flush();
  });

  it("prefills an existing vehicle, without the photo picker", async () => {
    const view = await renderScreen({ vehicle: VEHICLE });

    await waitFor(() => {
      expect(screen.getByTestId("make-input").props.value).toBe("Jeep");
    });
    expect(screen.getByTestId("current-mileage-input").props.value).toBe("36200");
    expect(screen.getByTestId("fuel-type-FLEX").props.accessibilityState.selected).toBe(true);
    expect(screen.queryByTestId("pick-photo-button")).toBeNull();
    view.unmount();
    await flush();
  });

  // Kept last: it submits (see docs/steering/tech.md, RHF/TanStack gotcha).
  it("shows pt-BR validation errors when submitting an empty form", async () => {
    const view = await renderScreen();

    await waitFor(() => {
      expect(screen.getByTestId("submit-button")).toBeTruthy();
    });
    await flush();
    fireEvent.press(screen.getByTestId("submit-button"));

    await waitFor(() => {
      expect(screen.getByText("Marca é obrigatória")).toBeTruthy();
    });
    expect(screen.getByText("Modelo é obrigatório")).toBeTruthy();
    expect(screen.getByText("Ano de fabricação é obrigatório")).toBeTruthy();
    expect(screen.getByText("Quilometragem é obrigatória")).toBeTruthy();
    expect(apiFetch).not.toHaveBeenCalled();
    await flush();
    view.unmount();
    await flush();
  });
});
