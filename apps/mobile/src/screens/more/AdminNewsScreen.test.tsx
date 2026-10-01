import type { AdminChangelogEntry } from "@mony/shared-types";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";

import { apiFetch } from "../../lib/api-client";

import { AdminNewsScreen } from "./AdminNewsScreen";
import { NewsFormScreen } from "./NewsFormScreen";

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

const ENTRIES: AdminChangelogEntry[] = [
  {
    id: "active",
    title: "Relatórios chegaram",
    description: "Resumo do período.",
    videoId: "dQw4w9WgXcQ",
    publishedAt: "2026-09-29T12:00:00.000Z",
    expiresAt: "2099-12-31",
    status: "ACTIVE",
    readCount: 3,
    authorName: "Equipe Mony",
  },
  {
    id: "expired",
    title: "Promoção de janeiro",
    description: "Só em janeiro.",
    videoId: null,
    publishedAt: "2020-01-10T12:00:00.000Z",
    expiresAt: "2020-01-31",
    status: "ACTIVE",
    readCount: 1,
    authorName: "Equipe Mony",
  },
  {
    id: "inactive",
    title: "Rascunho antigo",
    description: "Tirado do ar.",
    videoId: null,
    publishedAt: "2026-09-01T12:00:00.000Z",
    expiresAt: null,
    status: "INACTIVE",
    readCount: 0,
    authorName: null,
  },
];

function renderScreen() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <NavigationContainer>
        <Stack.Navigator screenOptions={{ headerShown: false, animation: "none" }}>
          <Stack.Screen name="AdminNews" component={AdminNewsScreen} />
          <Stack.Screen name="NewsForm" component={NewsFormScreen} />
        </Stack.Navigator>
      </NavigationContainer>
    </QueryClientProvider>,
  );
}

const flush = () => new Promise<void>((resolve) => setTimeout(resolve, 50));

describe("AdminNewsScreen (Gerenciar novidades)", () => {
  beforeEach(() => mockedApiFetch.mockReset());

  it("lists every entry with what users see of it, its dates, readers and author", async () => {
    mockedApiFetch.mockResolvedValue(ENTRIES);
    const view = await renderScreen();
    await waitFor(() => {
      expect(screen.getByText("Relatórios chegaram")).toBeTruthy();
    });
    expect(mockedApiFetch).toHaveBeenCalledWith("/admin/changelog");

    // Active, with a last day.
    expect(screen.getByText("Ativa")).toBeTruthy();
    expect(screen.getByText("29/09/2026 até 31/12/2099")).toBeTruthy();
    expect(screen.getByText("3 leituras · Equipe Mony")).toBeTruthy();
    // Still ACTIVE in the database, but past its last day.
    expect(screen.getByText("Vencida")).toBeTruthy();
    expect(screen.getByText("10/01/2020 até 31/01/2020")).toBeTruthy();
    expect(screen.getByText("1 leitura · Equipe Mony")).toBeTruthy();
    // Inactive, no expiry, author gone.
    expect(screen.getByText("Inativa")).toBeTruthy();
    expect(screen.getByText("Desde 01/09/2026")).toBeTruthy();
    expect(screen.getByText("Ninguém leu ainda")).toBeTruthy();

    // In the order the API sent (newest first).
    const rows = screen.getAllByTestId(/^admin-news-(active|expired|inactive)$/);
    expect(rows.map((row) => row.props.testID)).toEqual([
      "admin-news-active",
      "admin-news-expired",
      "admin-news-inactive",
    ]);
    await view.unmount();
    await flush();
  });

  it("opens an entry to edit it", async () => {
    mockedApiFetch.mockResolvedValue(ENTRIES);
    const view = await renderScreen();
    await waitFor(() => {
      expect(screen.getByTestId("admin-news-inactive")).toBeTruthy();
    });
    await fireEvent.press(screen.getByTestId("admin-news-inactive"));
    await waitFor(() => {
      expect(screen.getByDisplayValue("Rascunho antigo")).toBeTruthy();
    });
    expect(screen.getByDisplayValue("Tirado do ar.")).toBeTruthy();
    expect(screen.getByTestId("delete-news-button")).toBeTruthy();
    await view.unmount();
    await flush();
  });

  it("opens an empty form from +", async () => {
    mockedApiFetch.mockResolvedValue(ENTRIES);
    const view = await renderScreen();
    await waitFor(() => {
      expect(screen.getByTestId("admin-news-active")).toBeTruthy();
    });
    await fireEvent.press(screen.getByTestId("add-news-button"));
    await waitFor(() => {
      expect(screen.getByTestId("title-input")).toBeTruthy();
    });
    expect(screen.getByTestId("title-input").props.value).toBe("");
    // A new one has no status or delete yet.
    expect(screen.queryByTestId("delete-news-button")).toBeNull();
    expect(screen.queryByTestId("status-toggle")).toBeNull();
    await view.unmount();
    await flush();
  });

  it("invites to publish the first one when there's none", async () => {
    mockedApiFetch.mockResolvedValue([]);
    const view = await renderScreen();
    await waitFor(() => {
      expect(screen.getByText("Nenhuma novidade publicada")).toBeTruthy();
    });
    await fireEvent.press(screen.getByTestId("admin-news-empty-add"));
    await waitFor(() => {
      expect(screen.getByTestId("title-input")).toBeTruthy();
    });
    await view.unmount();
    await flush();
  });

  it("shows the app's own copy when the list fails, never the API's", async () => {
    mockedApiFetch.mockRejectedValue(new Error("Admins only."));
    const view = await renderScreen();
    await waitFor(() => {
      expect(screen.getByText("Algo deu errado. Tente novamente.")).toBeTruthy();
    });
    expect(screen.queryByText("Admins only.")).toBeNull();

    mockedApiFetch.mockResolvedValue(ENTRIES);
    await fireEvent.press(screen.getByTestId("retry-button"));
    await waitFor(() => {
      expect(screen.getByText("Relatórios chegaram")).toBeTruthy();
    });
    await view.unmount();
    await flush();
  });
});
