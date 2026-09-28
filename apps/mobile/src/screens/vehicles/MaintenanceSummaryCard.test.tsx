import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import { Text } from "react-native";

import { apiFetch } from "../../lib/api-client";

import { MaintenanceSummaryCard } from "./MaintenanceSummaryCard";

jest.mock("../../lib/api-client", () => ({
  apiFetch: jest.fn(),
  ApiError: class ApiError extends Error {},
}));

const mockedApiFetch = apiFetch as jest.Mock;
const Stack = createNativeStackNavigator();

function alert(id: string, name: string, status: string, overrides: Record<string, unknown> = {}) {
  return {
    maintenanceTypeId: id,
    name,
    system: "ENGINE",
    kmInterval: 10000,
    monthsInterval: null,
    status,
    percent: status === "OVERDUE" ? 100 : status === "URGENT" ? 90 : status === "WARNING" ? 80 : 20,
    nextMileage: 45000,
    kmRemaining: 1000,
    nextDate: null,
    daysRemaining: null,
    lastService: { date: "2026-01-10", mileage: 35000 },
    ...overrides,
  };
}

// Records where the card navigated to, and with which params.
const visited: Array<{ name: string; params: unknown }> = [];
function Recorder({ route }: { route: { name: string; params?: unknown } }) {
  visited.push({ name: route.name, params: route.params });
  return <Text>{route.name}</Text>;
}

function renderCard() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <NavigationContainer>
        <Stack.Navigator screenOptions={{ headerShown: false, animation: "none" }}>
          <Stack.Screen name="Host">
            {() => <MaintenanceSummaryCard vehicleId="veh-1" />}
          </Stack.Screen>
          <Stack.Screen name="MaintenanceRecordForm" component={Recorder} />
          <Stack.Screen name="Maintenance" component={Recorder} />
          <Stack.Screen name="MaintenanceTypeForm" component={Recorder} />
        </Stack.Navigator>
      </NavigationContainer>
    </QueryClientProvider>,
  );
}

const flush = () => new Promise<void>((resolve) => setTimeout(resolve, 50));

describe("MaintenanceSummaryCard", () => {
  beforeEach(() => {
    mockedApiFetch.mockReset();
    visited.length = 0;
  });

  it("explains what to track and offers the first type when there are none", async () => {
    mockedApiFetch.mockResolvedValue([]);
    const view = await renderCard();

    await waitFor(() => {
      expect(screen.getByTestId("create-first-maintenance-type")).toBeTruthy();
    });
    expect(mockedApiFetch).toHaveBeenCalledWith("/vehicles/veh-1/maintenance-alerts");
    await fireEvent.press(screen.getByTestId("create-first-maintenance-type"));
    await waitFor(() => {
      expect(visited.at(-1)?.name).toBe("MaintenanceTypeForm");
    });
    view.unmount();
    await flush();
  });

  it("counts what needs attention and previews the 3 most urgent", async () => {
    mockedApiFetch.mockResolvedValue([
      alert("mt-a", "Arrefecimento", "OVERDUE", { lastService: null }),
      alert("mt-b", "Óleo", "OVERDUE", { kmRemaining: -300 }),
      alert("mt-c", "Alinhamento", "URGENT"),
      alert("mt-d", "Pastilhas", "ON_TRACK"),
    ]);
    const view = await renderCard();

    await waitFor(() => {
      expect(screen.getByTestId("maintenance-counts")).toHaveTextContent("2 atrasadas · 1 urgente");
    });
    expect(screen.getByTestId("maintenance-alert-mt-a")).toBeTruthy();
    expect(screen.getByText("Nunca registrada")).toBeTruthy();
    expect(screen.getByText("Passou 300 km")).toBeTruthy();
    expect(screen.queryByTestId("maintenance-alert-mt-d")).toBeNull();
    expect(screen.getByText("Ver todas (4)")).toBeTruthy();
    view.unmount();
    await flush();
  });

  it("registers a maintenance with the tapped type already chosen", async () => {
    mockedApiFetch.mockResolvedValue([alert("mt-b", "Óleo", "URGENT")]);
    const view = await renderCard();

    await waitFor(() => {
      expect(screen.getByTestId("maintenance-alert-mt-b")).toBeTruthy();
    });
    await fireEvent.press(screen.getByTestId("maintenance-alert-mt-b"));
    await waitFor(() => {
      expect(visited.at(-1)).toEqual({
        name: "MaintenanceRecordForm",
        params: { vehicleId: "veh-1", maintenanceTypeId: "mt-b" },
      });
    });
    view.unmount();
    await flush();
  });

  it("says everything is up to date when nothing needs attention", async () => {
    mockedApiFetch.mockResolvedValue([alert("mt-d", "Pastilhas", "ON_TRACK")]);
    const view = await renderCard();

    await waitFor(() => {
      expect(screen.getByTestId("maintenance-counts")).toHaveTextContent("Tudo em dia");
    });
    view.unmount();
    await flush();
  });
});
