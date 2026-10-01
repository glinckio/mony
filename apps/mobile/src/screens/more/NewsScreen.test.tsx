import type { ChangelogEntry } from "@mony/shared-types";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";

import { apiFetch } from "../../lib/api-client";

import { NewsScreen } from "./NewsScreen";

jest.mock("../../lib/api-client", () => ({ apiFetch: jest.fn() }));
jest.mock("expo-web-browser", () => ({ openBrowserAsync: jest.fn() }));

const mockedApiFetch = apiFetch as jest.Mock;
const Stack = createNativeStackNavigator();

const ENTRIES: ChangelogEntry[] = [
  {
    id: "b",
    title: "Relatórios chegaram",
    description: "Resumo do período e categorias.",
    videoId: "dQw4w9WgXcQ",
    publishedAt: "2026-09-29T12:00:00.000Z",
    expiresAt: null,
    readAt: null,
  },
  {
    id: "a",
    title: "Manutenção com lembretes",
    description: "O Mony avisa quando chegar a hora.",
    videoId: null,
    publishedAt: "2026-09-10T12:00:00.000Z",
    expiresAt: null,
    readAt: "2026-09-12T15:00:00.000Z",
  },
];

function renderScreen() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <NavigationContainer>
        <Stack.Navigator screenOptions={{ headerShown: false, animation: "none" }}>
          <Stack.Screen name="News" component={NewsScreen} />
        </Stack.Navigator>
      </NavigationContainer>
    </QueryClientProvider>,
  );
}

const flush = () => new Promise<void>((resolve) => setTimeout(resolve, 50));

describe("NewsScreen (Novidades)", () => {
  beforeEach(() => mockedApiFetch.mockReset());

  it("lists every entry, newest first, new or read", async () => {
    mockedApiFetch.mockResolvedValue({ entries: ENTRIES });
    const view = await renderScreen();
    await waitFor(() => {
      expect(screen.getByText("Relatórios chegaram")).toBeTruthy();
    });
    expect(screen.getByText("Nova")).toBeTruthy();
    expect(screen.getByText("Lida em 12/09/2026")).toBeTruthy();
    expect(screen.getByText("Tem vídeo")).toBeTruthy();
    await view.unmount();
    await flush();
  });

  it("opens one in full, marking it read only while unread", async () => {
    mockedApiFetch.mockImplementation(async (path: string) =>
      path === "/changelog" ? { entries: ENTRIES } : undefined,
    );
    const view = await renderScreen();
    await waitFor(() => {
      expect(screen.getByTestId("news-card-a")).toBeTruthy();
    });

    // Already read: just "Fechar".
    await fireEvent.press(screen.getByTestId("news-card-a"));
    await waitFor(() => {
      expect(screen.getByTestId("news-sheet-close")).toBeTruthy();
    });
    expect(screen.queryByTestId("news-sheet-mark-read")).toBeNull();
    await fireEvent.press(screen.getByTestId("news-sheet-close"));

    await fireEvent.press(screen.getByTestId("news-card-b"));
    await fireEvent.press(await waitFor(() => screen.getByTestId("news-sheet-mark-read")));
    await waitFor(() => {
      expect(mockedApiFetch).toHaveBeenCalledWith("/changelog/b/read", { method: "POST" });
    });
    await view.unmount();
    await flush();
  });

  it("shows it read right away, without waiting for the list to reload", async () => {
    let releaseReload: () => void = () => undefined;
    let loads = 0;
    mockedApiFetch.mockImplementation(async (path: string) => {
      if (path !== "/changelog") return undefined;
      loads += 1;
      // The reload after marking read hangs: the card must not wait for it.
      if (loads > 1) await new Promise<void>((resolve) => (releaseReload = resolve));
      return { entries: ENTRIES };
    });
    const view = await renderScreen();
    await waitFor(() => {
      expect(screen.getByTestId("news-card-b")).toBeTruthy();
    });
    await fireEvent.press(screen.getByTestId("news-card-b"));
    await fireEvent.press(await waitFor(() => screen.getByTestId("news-sheet-mark-read")));
    await waitFor(() => {
      expect(screen.queryByTestId("news-sheet-mark-read")).toBeNull();
    });
    expect(screen.queryByText("Nova")).toBeNull();
    expect(screen.getAllByText(/^Lida em/)).toHaveLength(2);
    releaseReload();
    await view.unmount();
    await flush();
  });

  it("keeps the sheet open with a pt-BR notice inside it when marking read fails", async () => {
    mockedApiFetch.mockImplementation(async (path: string) => {
      if (path === "/changelog") return { entries: ENTRIES };
      throw new Error("Internal server error");
    });
    const view = await renderScreen();
    await waitFor(() => {
      expect(screen.getByTestId("news-card-b")).toBeTruthy();
    });
    await fireEvent.press(screen.getByTestId("news-card-b"));
    await fireEvent.press(await waitFor(() => screen.getByTestId("news-sheet-mark-read")));
    await waitFor(() => {
      expect(screen.getByTestId("news-sheet-error")).toBeTruthy();
    });
    expect(screen.getByText("Não deu para marcar como lida. Tente de novo.")).toBeTruthy();
    expect(screen.queryByText("Internal server error")).toBeNull();
    expect(screen.getByTestId("news-sheet-mark-read")).toBeTruthy();

    // Closing clears it for the next one opened.
    await fireEvent.press(screen.getByTestId("news-sheet-close"));
    await fireEvent.press(screen.getByTestId("news-card-a"));
    await waitFor(() => {
      expect(screen.getByTestId("news-sheet-close")).toBeTruthy();
    });
    expect(screen.queryByTestId("news-sheet-error")).toBeNull();
    await view.unmount();
    await flush();
  });

  it("has a friendly empty state", async () => {
    mockedApiFetch.mockResolvedValue({ entries: [] });
    const view = await renderScreen();
    await waitFor(() => {
      expect(screen.getByText("Nenhuma novidade por aqui")).toBeTruthy();
    });
    await view.unmount();
    await flush();
  });
});
