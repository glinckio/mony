import type { ChangelogEntry, ChangelogUnread } from "@mony/shared-types";
import { NavigationContext } from "@react-navigation/native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import * as WebBrowser from "expo-web-browser";
import type { ComponentProps, ReactNode } from "react";

import { apiFetch } from "../../lib/api-client";
import { useAuthStore } from "../../lib/auth-store";
import { useNewsSession } from "../../lib/news-session";

import { StartupNews } from "./StartupNews";

jest.mock("../../lib/api-client", () => ({ apiFetch: jest.fn() }));
jest.mock("expo-web-browser", () => ({ openBrowserAsync: jest.fn(() => Promise.resolve()) }));

const mockedApiFetch = apiFetch as jest.Mock;
const mockedOpenBrowser = WebBrowser.openBrowserAsync as jest.Mock;

const entry = (id: string, overrides: Partial<ChangelogEntry> = {}): ChangelogEntry => ({
  id,
  title: `Novidade ${id}`,
  description: "Primeira linha.\nSegunda linha.",
  videoId: null,
  publishedAt: "2026-09-29T12:00:00.000Z",
  expiresAt: null,
  readAt: null,
  ...overrides,
});

const unread = (first: ChangelogEntry | null, total: number): ChangelogUnread => ({
  entry: first,
  total,
});

type NavigationValue = ComponentProps<typeof NavigationContext.Provider>["value"];

// A screen's navigation, as far as useScreenFocused needs it: focus state
// plus focus/blur listeners the test can fire.
function fakeScreen(focused: boolean) {
  const listeners: Record<string, Array<() => void>> = { focus: [], blur: [] };
  const navigation = {
    isFocused: () => focused,
    addListener: (event: "focus" | "blur", listener: () => void) => {
      listeners[event]!.push(listener);
      return () => {
        listeners[event] = listeners[event]!.filter((item) => item !== listener);
      };
    },
  };
  return {
    navigation: navigation as unknown as NavigationValue,
    emit: (event: "focus" | "blur") => {
      focused = event === "focus";
      listeners[event]!.forEach((listener) => listener());
    },
  };
}

async function renderNews(options: { navigation?: NavigationValue } = {}) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  const wrap = (children: ReactNode) =>
    options.navigation ? (
      <NavigationContext.Provider value={options.navigation}>{children}</NavigationContext.Provider>
    ) : (
      children
    );
  const view = await render(
    <QueryClientProvider client={queryClient}>{wrap(<StartupNews />)}</QueryClientProvider>,
  );
  return { view, queryClient };
}

const flush = () => new Promise<void>((resolve) => setTimeout(resolve, 50));

describe("StartupNews (Início)", () => {
  beforeEach(() => {
    mockedApiFetch.mockReset();
    mockedOpenBrowser.mockClear();
    useNewsSession.setState({ shownFor: null });
    useAuthStore.setState({
      user: { id: "user-1", name: "Marina", email: "m@example.com", activeWorkspace: "PERSONAL" },
    });
  });

  it("opens the newest unread one by itself, with how many are waiting", async () => {
    mockedApiFetch.mockResolvedValue(unread(entry("b", { videoId: "dQw4w9WgXcQ" }), 2));
    const { view } = await renderNews();

    await waitFor(() => {
      expect(screen.getByText("Novidade b")).toBeTruthy();
    });
    expect(mockedApiFetch).toHaveBeenCalledWith("/changelog/unread");
    expect(screen.getByText("2 novas")).toBeTruthy();
    expect(screen.getByText(/^Há mais 1 novidade não lida/)).toBeTruthy();
    // Plain text, line breaks kept.
    expect(screen.getByTestId("startup-news-text").props.children).toBe(
      "Primeira linha.\nSegunda linha.",
    );
    // The video opens only when tapped.
    expect(mockedOpenBrowser).not.toHaveBeenCalled();
    await fireEvent.press(screen.getByTestId("news-video"));
    expect(mockedOpenBrowser).toHaveBeenCalledWith("https://www.youtube.com/watch?v=dQw4w9WgXcQ");
    await view.unmount();
    await flush();
  });

  it("records nothing on Fechar, and doesn't open again in the same visit", async () => {
    mockedApiFetch.mockResolvedValue(unread(entry("a"), 1));
    const first = await renderNews();
    await waitFor(() => {
      expect(screen.getByText("Novidade a")).toBeTruthy();
    });
    await fireEvent.press(screen.getByTestId("startup-news-close"));
    expect(mockedApiFetch).not.toHaveBeenCalledWith("/changelog/a/read", { method: "POST" });
    await first.view.unmount();

    // Back to Início, same app session: no popup, no request.
    mockedApiFetch.mockClear();
    const second = await renderNews();
    await flush();
    expect(mockedApiFetch).not.toHaveBeenCalled();
    expect(screen.queryByText("Novidade a")).toBeNull();
    await second.view.unmount();
    await flush();
  });

  it("marks it read", async () => {
    mockedApiFetch.mockImplementation(async (path: string) =>
      path === "/changelog/unread" ? unread(entry("a"), 1) : undefined,
    );
    const { view } = await renderNews();
    await waitFor(() => {
      expect(screen.getByTestId("startup-news-mark-read")).toBeTruthy();
    });
    await fireEvent.press(screen.getByTestId("startup-news-mark-read"));
    await waitFor(() => {
      expect(mockedApiFetch).toHaveBeenCalledWith("/changelog/a/read", { method: "POST" });
    });
    await view.unmount();
    await flush();
  });

  it("shows nothing when everything's read, and doesn't ask again this visit", async () => {
    mockedApiFetch.mockResolvedValue(unread(null, 0));
    const { view, queryClient } = await renderNews();
    await flush();
    expect(screen.queryByTestId("startup-news-close")).toBeNull();
    // Checked for this visit, found or not.
    expect(useNewsSession.getState().shownFor).toBe("user-1");

    // An admin publishes (or a read in Novidades) mid-visit: the
    // invalidation must not bring the popup over another screen.
    mockedApiFetch.mockClear();
    mockedApiFetch.mockResolvedValue(unread(entry("new"), 1));
    await act(async () => {
      await queryClient.invalidateQueries({ queryKey: ["changelog"] });
    });
    await flush();
    expect(mockedApiFetch).not.toHaveBeenCalled();
    expect(screen.queryByText("Novidade new")).toBeNull();
    await view.unmount();
    await flush();
  });

  it("waits for Início to be on screen before opening", async () => {
    const screenNav = fakeScreen(false);
    mockedApiFetch.mockResolvedValue(unread(entry("a"), 1));
    const { view } = await renderNews({ navigation: screenNav.navigation });
    await flush();
    expect(screen.queryByText("Novidade a")).toBeNull();
    expect(useNewsSession.getState().shownFor).toBeNull();

    await act(async () => {
      screenNav.emit("focus");
    });
    await waitFor(() => {
      expect(screen.getByText("Novidade a")).toBeTruthy();
    });
    expect(useNewsSession.getState().shownFor).toBe("user-1");
    await view.unmount();
    await flush();
  });

  it("shows a lone unread one without the count or the 'Há mais' note", async () => {
    mockedApiFetch.mockResolvedValue(unread(entry("a"), 1));
    const { view } = await renderNews();
    await waitFor(() => {
      expect(screen.getByText("Novidade a")).toBeTruthy();
    });
    expect(screen.queryByText(/novas$/)).toBeNull();
    expect(screen.queryByText(/^Há mais/)).toBeNull();
    // No video: no button that would reach YouTube.
    expect(screen.queryByTestId("news-video")).toBeNull();
    expect(screen.getByText("Fechar")).toBeTruthy();
    expect(screen.getByText("Marcar como lida")).toBeTruthy();
    await view.unmount();
    await flush();
  });

  it("shows no video button for a stored id that isn't a YouTube id", async () => {
    mockedApiFetch.mockResolvedValue(unread(entry("a", { videoId: "x&list=evil" }), 1));
    const { view } = await renderNews();
    await waitFor(() => {
      expect(screen.getByText("Novidade a")).toBeTruthy();
    });
    expect(screen.queryByTestId("news-video")).toBeNull();
    await view.unmount();
    await flush();
  });

  it("says so inside the sheet when the video can't be opened", async () => {
    mockedOpenBrowser.mockRejectedValueOnce(new Error("No browser"));
    mockedApiFetch.mockResolvedValue(unread(entry("a", { videoId: "dQw4w9WgXcQ" }), 1));
    const { view } = await renderNews();
    await waitFor(() => {
      expect(screen.getByTestId("news-video")).toBeTruthy();
    });
    await fireEvent.press(screen.getByTestId("news-video"));
    await waitFor(() => {
      expect(screen.getByText("Não deu para abrir o vídeo. Tente de novo.")).toBeTruthy();
    });
    expect(screen.queryByText("No browser")).toBeNull();
    await view.unmount();
    await flush();
  });

  it("renders markup in the title and text as plain text", async () => {
    mockedApiFetch.mockResolvedValue(
      unread(
        entry("x", {
          title: "<b>Negrito</b>",
          description: '<script>alert("oi")</script><img src=x onerror=alert(1)>',
        }),
        1,
      ),
    );
    const { view } = await renderNews();
    await waitFor(() => {
      expect(screen.getByText("<b>Negrito</b>")).toBeTruthy();
    });
    expect(
      screen.getByText('<script>alert("oi")</script><img src=x onerror=alert(1)>'),
    ).toBeTruthy();
    await view.unmount();
    await flush();
  });

  it("closes after marking read; the next unread one waits for the next visit", async () => {
    const read = new Set<string>();
    mockedApiFetch.mockImplementation(async (path: string) => {
      if (path === "/changelog/unread") {
        const waiting = [entry("b"), entry("a")].filter((item) => !read.has(item.id));
        return unread(waiting[0] ?? null, waiting.length);
      }
      read.add(path.split("/")[2]!);
      return undefined;
    });
    const first = await renderNews();
    await waitFor(() => {
      expect(screen.getByText("Novidade b")).toBeTruthy();
    });
    await fireEvent.press(screen.getByTestId("startup-news-mark-read"));
    await waitFor(() => {
      expect(screen.queryByTestId("startup-news-mark-read")).toBeNull();
    });
    // Not the other one right away, in the same visit.
    await flush();
    expect(screen.queryByText("Novidade a")).toBeNull();
    await first.view.unmount();
    await flush();

    // The app is opened again: now the other one.
    useNewsSession.setState({ shownFor: null });
    const second = await renderNews();
    await waitFor(() => {
      expect(screen.getByText("Novidade a")).toBeTruthy();
    });
    expect(screen.queryByText("Novidade b")).toBeNull();
    await second.view.unmount();
    await flush();
  });

  it("keeps it open with a pt-BR notice inside the sheet when marking read fails", async () => {
    mockedApiFetch.mockImplementation(async (path: string) => {
      if (path === "/changelog/unread") return unread(entry("a"), 1);
      throw new Error("Internal server error");
    });
    const { view } = await renderNews();
    await waitFor(() => {
      expect(screen.getByTestId("startup-news-mark-read")).toBeTruthy();
    });
    await fireEvent.press(screen.getByTestId("startup-news-mark-read"));
    await waitFor(() => {
      expect(screen.getByTestId("startup-news-error")).toBeTruthy();
    });
    expect(screen.getByText("Não deu para marcar como lida. Tente de novo.")).toBeTruthy();
    expect(screen.getByTestId("startup-news-mark-read")).toBeTruthy();
    expect(screen.queryByText("Internal server error")).toBeNull();
    await view.unmount();
    await flush();
  });

  it("is per user: another account signed in on this visit still gets it", async () => {
    useNewsSession.setState({ shownFor: "someone-else" });
    mockedApiFetch.mockResolvedValue(unread(entry("a"), 1));
    const { view } = await renderNews();
    await waitFor(() => {
      expect(screen.getByText("Novidade a")).toBeTruthy();
    });
    expect(useNewsSession.getState().shownFor).toBe("user-1");
    await view.unmount();
    await flush();
  });

  it("asks nothing while signed out", async () => {
    useAuthStore.setState({ user: null });
    mockedApiFetch.mockResolvedValue(unread(entry("a"), 1));
    const { view } = await renderNews();
    await flush();
    expect(mockedApiFetch).not.toHaveBeenCalled();
    await view.unmount();
    await flush();
  });
});
