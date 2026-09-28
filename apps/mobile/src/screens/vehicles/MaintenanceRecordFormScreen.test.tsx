import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";

import { apiFetch } from "../../lib/api-client";
import { localTodayISO } from "../../lib/date-mask";
import { pickReceiptPdf, uploadReceipt } from "../../lib/maintenance-receipt";
import { useToastStore } from "../../lib/toast-store";

import { MaintenanceRecordFormScreen } from "./MaintenanceRecordFormScreen";

jest.mock("../../lib/api-client", () => ({
  apiFetch: jest.fn(),
  ApiError: class ApiError extends Error {},
}));
// The pickers/uploader wrap native modules; the form's behavior around
// them is what's under test.
jest.mock("../../lib/maintenance-receipt", () => ({
  CameraPermissionError: class CameraPermissionError extends Error {},
  ReceiptTooLargeError: class ReceiptTooLargeError extends Error {},
  pickReceiptPhoto: jest.fn(),
  pickReceiptPdf: jest.fn(),
  uploadReceipt: jest.fn(),
  discardPickedReceipt: jest.fn(),
}));

const mockedApiFetch = apiFetch as jest.Mock;
const Stack = createNativeStackNavigator();

const VEHICLE = { id: "veh-1", displayName: "Jeep Renegade 2022", currentMileage: 36200 };
const TYPES = [
  {
    id: "mt-oil",
    name: "Troca de óleo",
    description: null,
    system: "LUBRICATION",
    kmInterval: 10000,
    monthsInterval: 12,
    createdAt: "2026-09-26T12:00:00.000Z",
  },
  {
    id: "mt-wipers",
    name: "Palhetas",
    description: null,
    system: null,
    kmInterval: 15000,
    monthsInterval: null,
    createdAt: "2026-09-26T12:00:00.000Z",
  },
];

function mockApi(onPost?: (body: Record<string, unknown>) => unknown) {
  mockedApiFetch.mockImplementation(async (path: string, init?: RequestInit) => {
    if (path === "/vehicles/veh-1") return VEHICLE;
    if (path === "/maintenance-types") return TYPES;
    if (path === "/vehicles/veh-1/maintenance-records" && init?.method === "POST") {
      const body = JSON.parse(String(init.body)) as Record<string, unknown>;
      return onPost ? onPost(body) : { id: "mr-new", ...body };
    }
    throw new Error(`unexpected ${path}`);
  });
}

function renderScreen(params: Record<string, unknown> = { vehicleId: "veh-1" }) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <NavigationContainer>
        <Stack.Navigator screenOptions={{ headerShown: false, animation: "none" }}>
          <Stack.Screen
            name="MaintenanceRecordForm"
            component={MaintenanceRecordFormScreen}
            initialParams={params}
          />
        </Stack.Navigator>
      </NavigationContainer>
    </QueryClientProvider>,
  );
}

const flush = () => new Promise<void>((resolve) => setTimeout(resolve, 50));
const postCalls = () =>
  mockedApiFetch.mock.calls.filter(
    ([, init]) => (init as RequestInit | undefined)?.method === "POST",
  );

describe("MaintenanceRecordFormScreen", () => {
  beforeEach(() => {
    mockedApiFetch.mockReset();
    (uploadReceipt as jest.Mock).mockReset();
    (pickReceiptPdf as jest.Mock).mockReset();
    useToastStore.getState().hide();
  });

  it("prefills the vehicle's mileage and today, with the tapped type chosen", async () => {
    mockApi();
    const view = await renderScreen({ vehicleId: "veh-1", maintenanceTypeId: "mt-oil" });

    await waitFor(() => {
      expect(screen.getByTestId("mileage-input").props.value).toBe("36200");
    });
    const [year, month, day] = localTodayISO().split("-");
    expect(screen.getByTestId("date-input").props.value).toBe(`${day}/${month}/${year}`);
    expect(
      screen.getByTestId("maintenance-type-option-mt-oil").props.accessibilityState.selected,
    ).toBe(true);
    // Grouped by system; a type without one under "Geral".
    expect(screen.getByText("Lubrificação")).toBeTruthy();
    expect(screen.getByText("Geral")).toBeTruthy();
    view.unmount();
    await flush();
  });

  it("requires a type before saving", async () => {
    mockApi();
    const view = await renderScreen();

    await waitFor(() => {
      expect(screen.getByTestId("mileage-input").props.value).toBe("36200");
    });
    await fireEvent.press(screen.getByTestId("submit-button"));

    await waitFor(() => {
      expect(screen.getByText("Escolha o tipo de manutenção")).toBeTruthy();
    });
    expect(postCalls()).toHaveLength(0);
    view.unmount();
    await flush();
  });

  it("warns (without blocking) when the mileage is below the vehicle's", async () => {
    mockApi();
    const view = await renderScreen({ vehicleId: "veh-1", maintenanceTypeId: "mt-oil" });

    await waitFor(() => {
      expect(screen.getByTestId("mileage-input").props.value).toBe("36200");
    });
    expect(screen.queryByTestId("past-service-notice")).toBeNull();
    await fireEvent.changeText(screen.getByTestId("mileage-input"), "30000");

    await waitFor(() => {
      expect(screen.getByTestId("past-service-notice")).toBeTruthy();
    });
    await fireEvent.press(screen.getByTestId("submit-button"));
    await waitFor(() => {
      expect(postCalls()).toHaveLength(1);
    });
    expect(JSON.parse(String(postCalls()[0]![1].body))).toMatchObject({
      maintenanceTypeId: "mt-oil",
      mileage: 30000,
      date: localTodayISO(),
    });
    view.unmount();
    await flush();
  });

  it("saves, then uploads the chosen PDF receipt for the new record", async () => {
    mockApi();
    (pickReceiptPdf as jest.Mock).mockResolvedValue({
      uri: "file:///nota.pdf",
      kind: "PDF",
      name: "nota.pdf",
    });
    (uploadReceipt as jest.Mock).mockResolvedValue({});
    const view = await renderScreen({ vehicleId: "veh-1", maintenanceTypeId: "mt-oil" });

    await waitFor(() => {
      expect(screen.getByTestId("mileage-input").props.value).toBe("36200");
    });
    await fireEvent.press(screen.getByTestId("receipt-pdf-button"));
    await waitFor(() => {
      expect(screen.getByText("nota.pdf")).toBeTruthy();
    });
    await fireEvent.changeText(screen.getByTestId("location-input"), "Auto Center Silva");
    await fireEvent.press(screen.getByTestId("submit-button"));

    await waitFor(() => {
      expect(uploadReceipt).toHaveBeenCalledWith("veh-1", "mr-new", {
        uri: "file:///nota.pdf",
        kind: "PDF",
        name: "nota.pdf",
      });
    });
    expect(JSON.parse(String(postCalls()[0]![1].body))).toMatchObject({
      location: "Auto Center Silva",
    });
    view.unmount();
    await flush();
  });

  it("keeps the record when the receipt upload fails, and says so", async () => {
    mockApi();
    (pickReceiptPdf as jest.Mock).mockResolvedValue({ uri: "file:///n.pdf", kind: "PDF" });
    (uploadReceipt as jest.Mock).mockRejectedValue(new Error("network"));
    const view = await renderScreen({ vehicleId: "veh-1", maintenanceTypeId: "mt-oil" });

    await waitFor(() => {
      expect(screen.getByTestId("mileage-input").props.value).toBe("36200");
    });
    await fireEvent.press(screen.getByTestId("receipt-pdf-button"));
    await waitFor(() => {
      expect(screen.getByTestId("receipt-preview")).toBeTruthy();
    });
    await fireEvent.press(screen.getByTestId("submit-button"));

    await waitFor(() => {
      expect(useToastStore.getState().message).toBe(
        "Manutenção salva, mas não foi possível enviar o comprovante. Anexe de novo pelo histórico.",
      );
    });
    expect(postCalls()).toHaveLength(1);
    view.unmount();
    await flush();
  });

  it("shows a too-large PDF inline, without a toast", async () => {
    mockApi();
    const { ReceiptTooLargeError } = jest.requireMock("../../lib/maintenance-receipt");
    (pickReceiptPdf as jest.Mock).mockRejectedValue(new ReceiptTooLargeError());
    const view = await renderScreen({ vehicleId: "veh-1", maintenanceTypeId: "mt-oil" });

    await waitFor(() => {
      expect(screen.getByTestId("receipt-pdf-button")).toBeTruthy();
    });
    await fireEvent.press(screen.getByTestId("receipt-pdf-button"));

    await waitFor(() => {
      expect(screen.getByText("O PDF precisa ter até 10 MB.")).toBeTruthy();
    });
    expect(useToastStore.getState().message).toBeFalsy();
    view.unmount();
    await flush();
  });
});
