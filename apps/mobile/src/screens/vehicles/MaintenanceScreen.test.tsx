import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react-native";

import { apiFetch } from "../../lib/api-client";
import {
  discardPickedReceipt,
  openReceiptPdf,
  pickReceiptPdf,
  uploadReceipt,
} from "../../lib/maintenance-receipt";

import { MaintenanceScreen } from "./MaintenanceScreen";

jest.mock("../../lib/api-client", () => ({
  apiFetch: jest.fn(),
  ApiError: class ApiError extends Error {},
}));
jest.mock("../../lib/maintenance-receipt", () => ({
  CameraPermissionError: class CameraPermissionError extends Error {},
  ReceiptTooLargeError: class ReceiptTooLargeError extends Error {},
  discardPickedReceipt: jest.fn(),
  openReceiptPdf: jest.fn(),
  pickReceiptPdf: jest.fn(),
  pickReceiptPhoto: jest.fn(),
  uploadReceipt: jest.fn(),
}));

const mockedApiFetch = apiFetch as jest.Mock;
const Stack = createNativeStackNavigator();

const ALERTS = [
  {
    maintenanceTypeId: "mt-oil",
    name: "Troca de óleo",
    system: "LUBRICATION",
    kmInterval: 10000,
    monthsInterval: 12,
    status: "URGENT",
    percent: 90,
    nextMileage: 37000,
    kmRemaining: 800,
    nextDate: "2027-01-10",
    daysRemaining: 105,
    lastService: { date: "2026-01-10", mileage: 27000 },
  },
];
const RECORDS = [
  {
    id: "mr-2",
    vehicleId: "veh-1",
    maintenanceTypeId: "mt-oil",
    type: { name: "Troca de óleo", system: "LUBRICATION" },
    mileage: 27000,
    date: "2026-01-10",
    cost: "289.90",
    location: "Auto Center Silva",
    notes: "Filtro de ar também.",
    receipt: { url: "https://minio.example/nota.pdf?sig", kind: "PDF" },
    createdAt: "2026-01-10T12:00:00.000Z",
  },
  {
    id: "mr-1",
    vehicleId: "veh-1",
    maintenanceTypeId: "mt-oil",
    type: { name: "Troca de óleo", system: "LUBRICATION" },
    mileage: 17000,
    date: "2025-02-03",
    cost: "250.10",
    location: null,
    notes: null,
    receipt: null,
    createdAt: "2025-02-03T12:00:00.000Z",
  },
];

function mockApi() {
  mockedApiFetch.mockImplementation(async (path: string, init?: RequestInit) => {
    if (init?.method === "DELETE") return undefined;
    if (path.endsWith("/maintenance-alerts")) return ALERTS;
    if (path.endsWith("/maintenance-records")) return RECORDS;
    throw new Error(`unexpected ${path}`);
  });
}

function renderScreen(tab: "alerts" | "history") {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <NavigationContainer>
        <Stack.Navigator screenOptions={{ headerShown: false, animation: "none" }}>
          <Stack.Screen
            name="Maintenance"
            component={MaintenanceScreen}
            initialParams={{ vehicleId: "veh-1", tab }}
          />
        </Stack.Navigator>
      </NavigationContainer>
    </QueryClientProvider>,
  );
}

const flush = () => new Promise<void>((resolve) => setTimeout(resolve, 50));

describe("MaintenanceScreen", () => {
  beforeEach(() => {
    mockedApiFetch.mockReset();
    (openReceiptPdf as jest.Mock).mockReset();
  });

  it("lists every alert with its status and distance", async () => {
    mockApi();
    const view = await renderScreen("alerts");

    await waitFor(() => {
      expect(screen.getByTestId("maintenance-alert-mt-oil")).toBeTruthy();
    });
    expect(screen.getByText("Urgente")).toBeTruthy();
    expect(screen.getByText("Faltam 800 km · Vence em 105 dias")).toBeTruthy();
    view.unmount();
    await flush();
  });

  it("shows the history with what was spent", async () => {
    mockApi();
    const view = await renderScreen("history");

    await waitFor(() => {
      expect(screen.getByTestId("maintenance-summary")).toHaveTextContent(/2 manutenções/);
    });
    expect(screen.getByTestId("maintenance-summary")).toHaveTextContent(/R\$\s540,00/);
    expect(screen.getByTestId("maintenance-record-mr-2")).toBeTruthy();
    view.unmount();
    await flush();
  });

  it("opens a record, its PDF receipt, and deletes it after confirming in the same sheet", async () => {
    mockApi();
    const view = await renderScreen("history");

    await waitFor(() => {
      expect(screen.getByTestId("maintenance-record-mr-2")).toBeTruthy();
    });
    await fireEvent.press(screen.getByTestId("maintenance-record-mr-2"));

    const sheet = await waitFor(() => screen.getByTestId("maintenance-record-sheet"));
    expect(within(sheet).getByText("Auto Center Silva")).toBeTruthy();
    await fireEvent.press(within(sheet).getByTestId("open-receipt-pdf"));
    expect(openReceiptPdf).toHaveBeenCalledWith("https://minio.example/nota.pdf?sig");

    await fireEvent.press(within(sheet).getByTestId("delete-record-button"));
    await fireEvent.press(await waitFor(() => screen.getByTestId("confirm-delete-record")));

    await waitFor(() => {
      expect(mockedApiFetch).toHaveBeenCalledWith("/vehicles/veh-1/maintenance-records/mr-2", {
        method: "DELETE",
      });
    });
    view.unmount();
    await flush();
  });
  it("attaches a receipt to a record from its sheet (the retry path), then discards the local copy", async () => {
    mockApi();
    const picked = { uri: "file:///nota.pdf", kind: "PDF", name: "nota.pdf" };
    (pickReceiptPdf as jest.Mock).mockResolvedValue(picked);
    (uploadReceipt as jest.Mock).mockResolvedValue({
      ...RECORDS[1],
      receipt: { url: "https://minio.example/new.pdf?sig", kind: "PDF" },
    });
    const view = await renderScreen("history");

    await waitFor(() => {
      expect(screen.getByTestId("maintenance-record-mr-1")).toBeTruthy();
    });
    await fireEvent.press(screen.getByTestId("maintenance-record-mr-1"));
    await fireEvent.press(await waitFor(() => screen.getByTestId("attach-receipt-button")));
    await fireEvent.press(await waitFor(() => screen.getByTestId("attach-receipt-pdf")));

    await waitFor(() => {
      expect(uploadReceipt).toHaveBeenCalledWith("veh-1", "mr-1", picked);
    });
    expect(discardPickedReceipt).toHaveBeenCalledWith(picked);
    // The sheet shows the new receipt (the list cache was updated).
    await waitFor(() => {
      expect(screen.getByTestId("open-receipt-pdf")).toBeTruthy();
    });
    view.unmount();
    await flush();
  });
});
