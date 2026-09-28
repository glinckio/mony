import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";

import { ApiError, apiFetch } from "../../lib/api-client";

import { MaintenanceTypesScreen } from "./MaintenanceTypesScreen";

jest.mock("../../lib/api-client", () => {
  class MockApiError extends Error {
    statusCode: number;
    constructor(statusCode: number) {
      super("api error");
      this.statusCode = statusCode;
    }
  }
  return { apiFetch: jest.fn(), ApiError: MockApiError };
});

const mockedApiFetch = apiFetch as jest.Mock;
const Stack = createNativeStackNavigator();

const TYPES = [
  {
    id: "mt-brakes",
    name: "Pastilhas de freio",
    description: null,
    system: "BRAKES",
    kmInterval: 30000,
    monthsInterval: null,
    createdAt: "2026-09-26T12:00:00.000Z",
  },
  {
    id: "mt-wipers",
    name: "Palhetas",
    description: "Dianteiras e traseira",
    system: null,
    kmInterval: 15000,
    monthsInterval: 12,
    createdAt: "2026-09-26T12:00:00.000Z",
  },
];

function renderScreen() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <NavigationContainer>
        <Stack.Navigator screenOptions={{ headerShown: false, animation: "none" }}>
          <Stack.Screen name="MaintenanceTypes" component={MaintenanceTypesScreen} />
        </Stack.Navigator>
      </NavigationContainer>
    </QueryClientProvider>,
  );
}

const flush = () => new Promise<void>((resolve) => setTimeout(resolve, 50));

describe("MaintenanceTypesScreen", () => {
  beforeEach(() => {
    mockedApiFetch.mockReset();
  });

  it("groups types by system, with their interval", async () => {
    mockedApiFetch.mockResolvedValue(TYPES);
    const view = await renderScreen();

    await waitFor(() => {
      expect(screen.getByText("Freios")).toBeTruthy();
    });
    expect(screen.getByText("Geral")).toBeTruthy();
    expect(screen.getByText("a cada 30.000 km")).toBeTruthy();
    expect(screen.getByText("a cada 15.000 km ou 12 meses")).toBeTruthy();
    view.unmount();
    await flush();
  });

  it("explains, inside the sheet, why a type with history can't be deleted", async () => {
    mockedApiFetch.mockImplementation(async (_path: string, init?: RequestInit) => {
      if (init?.method === "DELETE")
        throw new (ApiError as unknown as new (s: number) => Error)(409);
      return TYPES;
    });
    const view = await renderScreen();

    await waitFor(() => {
      expect(screen.getByTestId("delete-maintenance-type-mt-brakes")).toBeTruthy();
    });
    await fireEvent.press(screen.getByTestId("delete-maintenance-type-mt-brakes"));
    await fireEvent.press(await waitFor(() => screen.getByTestId("confirm-sheet-confirm")));

    await waitFor(() => {
      expect(
        screen.getByText("Esse tipo tem manutenções registradas. Exclua esses registros antes."),
      ).toBeTruthy();
    });
    view.unmount();
    await flush();
  });

  it("offers to create the first type when there are none", async () => {
    mockedApiFetch.mockResolvedValue([]);
    const view = await renderScreen();

    await waitFor(() => {
      expect(screen.getByTestId("empty-add-maintenance-type")).toBeTruthy();
    });
    view.unmount();
    await flush();
  });
});
