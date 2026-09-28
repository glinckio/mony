import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import { Text } from "react-native";

import { ApiError, apiFetch } from "../../lib/api-client";

import { MaintenanceTypeFormScreen } from "./MaintenanceTypeFormScreen";

jest.mock("../../lib/api-client", () => {
  class MockApiError extends Error {
    statusCode: number;
    constructor(statusCode: number, message: string) {
      super(message);
      this.statusCode = statusCode;
    }
  }
  return { apiFetch: jest.fn(), ApiError: MockApiError };
});

const mockedApiFetch = apiFetch as jest.Mock;
const Stack = createNativeStackNavigator();

// What the screens underneath have cached when the form opens.
const TYPES_KEY = ["maintenance-types"];
const ALERTS_KEY = ["maintenance-alerts", "veh-1"];
const RECORDS_KEY = ["maintenance-records", "veh-1"];
const VEHICLE_KEY = ["vehicle", "veh-1"];

function MaintenanceStub() {
  return <Text>Tela de manutenções</Text>;
}

async function renderScreen() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: Infinity } },
  });
  queryClient.setQueryData(TYPES_KEY, []);
  queryClient.setQueryData(ALERTS_KEY, []);
  queryClient.setQueryData(RECORDS_KEY, []);
  queryClient.setQueryData(VEHICLE_KEY, { id: "veh-1" });
  // Opened on top of another screen, so closing it is observable.
  const view = await render(
    <QueryClientProvider client={queryClient}>
      <NavigationContainer
        initialState={{
          index: 1,
          routes: [
            { name: "Maintenance", params: { vehicleId: "veh-1" } },
            { name: "MaintenanceTypeForm" },
          ],
        }}
      >
        <Stack.Navigator screenOptions={{ headerShown: false, animation: "none" }}>
          <Stack.Screen name="Maintenance" component={MaintenanceStub} />
          <Stack.Screen name="MaintenanceTypeForm" component={MaintenanceTypeFormScreen} />
        </Stack.Navigator>
      </NavigationContainer>
    </QueryClientProvider>,
  );
  return { view, queryClient };
}

const flush = () => new Promise<void>((resolve) => setTimeout(resolve, 50));
const isInvalidated = (client: QueryClient, key: unknown[]) =>
  client.getQueryState(key)?.isInvalidated;

describe("MaintenanceTypeFormScreen", () => {
  beforeEach(() => {
    mockedApiFetch.mockReset();
  });

  it("requires a name and a km interval, in pt-BR, without calling the API", async () => {
    const { view } = await renderScreen();

    await waitFor(() => {
      expect(screen.getByTestId("submit-button")).toBeTruthy();
    });
    await fireEvent.changeText(screen.getByTestId("name-input"), "   ");
    await fireEvent.press(screen.getByTestId("submit-button"));

    await waitFor(() => {
      expect(screen.getByText("Nome é obrigatório")).toBeTruthy();
    });
    expect(screen.getByText("Intervalo em km é obrigatório")).toBeTruthy();
    // Months are optional: no error for leaving them blank.
    expect(screen.queryByText("Intervalo em meses é obrigatório")).toBeNull();
    expect(mockedApiFetch).not.toHaveBeenCalled();
    view.unmount();
    await flush();
  });

  it("rejects intervals out of range", async () => {
    const { view } = await renderScreen();

    await waitFor(() => {
      expect(screen.getByTestId("submit-button")).toBeTruthy();
    });
    await fireEvent.changeText(screen.getByTestId("name-input"), "Troca de óleo");
    await fireEvent.changeText(screen.getByTestId("km-interval-input"), "0");
    // Three digits at most are kept; 121 is still over the 120-month cap.
    await fireEvent.changeText(screen.getByTestId("months-interval-input"), "1215");
    await fireEvent.press(screen.getByTestId("submit-button"));

    await waitFor(() => {
      expect(screen.getByText("Intervalo em km deve ser maior que zero")).toBeTruthy();
    });
    expect(screen.getByText("Intervalo em meses muito alto")).toBeTruthy();
    expect(screen.getByTestId("months-interval-input").props.value).toBe("121");

    await fireEvent.changeText(screen.getByTestId("km-interval-input"), "1000001");
    await fireEvent.press(screen.getByTestId("submit-button"));
    await waitFor(() => {
      expect(screen.getByText("Intervalo em km muito alto")).toBeTruthy();
    });
    expect(mockedApiFetch).not.toHaveBeenCalled();
    view.unmount();
    await flush();
  });

  it("creates a type with only the required fields, refreshes types and every vehicle's alerts, and closes", async () => {
    mockedApiFetch.mockResolvedValue({ id: "mt-new" });
    const { view, queryClient } = await renderScreen();

    await waitFor(() => {
      expect(screen.getByTestId("submit-button")).toBeTruthy();
    });
    await fireEvent.changeText(screen.getByTestId("name-input"), "  Troca de óleo  ");
    await fireEvent.changeText(screen.getByTestId("km-interval-input"), "10.000");
    await fireEvent.press(screen.getByTestId("submit-button"));

    await waitFor(() => {
      expect(screen.getByText("Tela de manutenções")).toBeTruthy();
    });
    expect(mockedApiFetch).toHaveBeenCalledTimes(1);
    const [path, init] = mockedApiFetch.mock.calls[0] as [string, RequestInit];
    expect(path).toBe("/maintenance-types");
    expect(init.method).toBe("POST");
    // Trimmed; blank optionals are left out, never sent as "" or null.
    expect(JSON.parse(String(init.body))).toEqual({ name: "Troca de óleo", kmInterval: 10000 });
    // The new type is tracked on every vehicle right away.
    expect(isInvalidated(queryClient, TYPES_KEY)).toBe(true);
    expect(isInvalidated(queryClient, ALERTS_KEY)).toBe(true);
    // Nothing else changed: no history or vehicle refetch.
    expect(isInvalidated(queryClient, RECORDS_KEY)).toBe(false);
    expect(isInvalidated(queryClient, VEHICLE_KEY)).toBe(false);
    view.unmount();
    await flush();
  });

  it("sends the optional months interval, system and description; tapping the chosen system again clears it", async () => {
    mockedApiFetch.mockResolvedValue({ id: "mt-new" });
    const { view } = await renderScreen();

    await waitFor(() => {
      expect(screen.getByTestId("submit-button")).toBeTruthy();
    });
    await fireEvent.changeText(screen.getByTestId("name-input"), "Pastilhas de freio");
    await fireEvent.changeText(screen.getByTestId("km-interval-input"), "30000");
    await fireEvent.changeText(screen.getByTestId("months-interval-input"), "24");
    await fireEvent.changeText(screen.getByTestId("description-input"), "Dianteiras");

    await fireEvent.press(screen.getByTestId("system-option-ENGINE"));
    await waitFor(() => {
      expect(screen.getByTestId("system-option-ENGINE").props.accessibilityState.selected).toBe(
        true,
      );
    });
    await fireEvent.press(screen.getByTestId("system-option-ENGINE"));
    await waitFor(() => {
      expect(screen.getByTestId("system-option-ENGINE").props.accessibilityState.selected).toBe(
        false,
      );
    });
    await fireEvent.press(screen.getByTestId("system-option-BRAKES"));
    await waitFor(() => {
      expect(screen.getByTestId("system-option-BRAKES").props.accessibilityState.selected).toBe(
        true,
      );
    });
    expect(screen.getByText("Freios")).toBeTruthy();

    await fireEvent.press(screen.getByTestId("submit-button"));

    await waitFor(() => {
      expect(mockedApiFetch).toHaveBeenCalledTimes(1);
    });
    expect(
      JSON.parse(String((mockedApiFetch.mock.calls[0] as [string, RequestInit])[1].body)),
    ).toEqual({
      name: "Pastilhas de freio",
      kmInterval: 30000,
      monthsInterval: 24,
      system: "BRAKES",
      description: "Dianteiras",
    });
    await waitFor(() => {
      expect(screen.getByText("Tela de manutenções")).toBeTruthy();
    });
    view.unmount();
    await flush();
  });

  it("stays open with generic pt-BR copy when the API refuses, never its raw message", async () => {
    mockedApiFetch.mockRejectedValue(
      new (ApiError as unknown as new (s: number, m: string) => Error)(
        400,
        "kmInterval must not be greater than 1000000",
      ),
    );
    const { view, queryClient } = await renderScreen();

    await waitFor(() => {
      expect(screen.getByTestId("submit-button")).toBeTruthy();
    });
    await fireEvent.changeText(screen.getByTestId("name-input"), "Troca de óleo");
    await fireEvent.changeText(screen.getByTestId("km-interval-input"), "10000");
    await fireEvent.press(screen.getByTestId("submit-button"));

    await waitFor(() => {
      expect(screen.getByText("Algo deu errado. Tente novamente.")).toBeTruthy();
    });
    expect(screen.queryByText(/must not be greater/)).toBeNull();
    expect(screen.queryByText("Tela de manutenções")).toBeNull();
    expect(isInvalidated(queryClient, TYPES_KEY)).toBe(false);
    expect(isInvalidated(queryClient, ALERTS_KEY)).toBe(false);
    view.unmount();
    await flush();
  });
});
