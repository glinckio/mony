import type { AdminChangelogEntry } from "@mony/shared-types";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";

import { apiFetch } from "../../lib/api-client";

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

const ENTRY: AdminChangelogEntry = {
  id: "news-1",
  title: "Relatórios chegaram",
  description: "Resumo do período.",
  videoId: "dQw4w9WgXcQ",
  publishedAt: "2026-09-29T12:00:00.000Z",
  expiresAt: "2026-12-31",
  status: "ACTIVE",
  readCount: 3,
  authorName: "Equipe Mony",
};

function renderForm(entry?: AdminChangelogEntry) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <NavigationContainer>
        <Stack.Navigator screenOptions={{ headerShown: false, animation: "none" }}>
          <Stack.Screen
            name="NewsForm"
            component={NewsFormScreen}
            initialParams={entry ? { entry } : undefined}
          />
        </Stack.Navigator>
      </NavigationContainer>
    </QueryClientProvider>,
  );
}

const flush = () => new Promise<void>((resolve) => setTimeout(resolve, 50));

describe("NewsFormScreen", () => {
  beforeEach(() => mockedApiFetch.mockReset());

  it("checks the fields before publishing", async () => {
    const view = await renderForm();
    await fireEvent.changeText(screen.getByTestId("video-input"), "https://vimeo.com/1");
    await fireEvent.press(screen.getByTestId("submit-button"));
    await waitFor(() => {
      expect(screen.getByText("Informe o título.")).toBeTruthy();
    });
    expect(screen.getByText("Escreva o texto da novidade.")).toBeTruthy();
    expect(screen.getByText("Use um link do YouTube.")).toBeTruthy();
    expect(mockedApiFetch).not.toHaveBeenCalled();
    await view.unmount();
    await flush();
  });

  it("publishes with only what was filled in", async () => {
    mockedApiFetch.mockResolvedValue(ENTRY);
    const view = await renderForm();
    await fireEvent.changeText(screen.getByTestId("title-input"), "  Relatórios chegaram ");
    await fireEvent.changeText(screen.getByTestId("description-input"), "Linha 1\nLinha 2");
    await fireEvent.changeText(screen.getByTestId("expires-input"), "31122026");
    await fireEvent.press(screen.getByTestId("submit-button"));
    await waitFor(() => {
      expect(mockedApiFetch).toHaveBeenCalledWith("/admin/changelog", {
        method: "POST",
        body: JSON.stringify({
          title: "Relatórios chegaram",
          description: "Linha 1\nLinha 2",
          expiresAt: "2026-12-31",
        }),
      });
    });
    await view.unmount();
    await flush();
  });

  it("edits, clearing the video and the date with null", async () => {
    mockedApiFetch.mockResolvedValue(ENTRY);
    const view = await renderForm(ENTRY);
    expect(screen.getByDisplayValue("https://youtu.be/dQw4w9WgXcQ")).toBeTruthy();
    expect(screen.getByDisplayValue("31/12/2026")).toBeTruthy();
    await fireEvent.changeText(screen.getByTestId("video-input"), "");
    await fireEvent.changeText(screen.getByTestId("expires-input"), "");
    await fireEvent.press(screen.getByTestId("status-toggle-INACTIVE"));
    await fireEvent.press(screen.getByTestId("submit-button"));
    await waitFor(() => {
      expect(mockedApiFetch).toHaveBeenCalledWith("/admin/changelog/news-1", {
        method: "PATCH",
        body: JSON.stringify({
          title: "Relatórios chegaram",
          description: "Resumo do período.",
          videoUrl: null,
          expiresAt: null,
          status: "INACTIVE",
        }),
      });
    });
    await view.unmount();
    await flush();
  });

  it("deletes after confirming", async () => {
    mockedApiFetch.mockResolvedValue(undefined);
    const view = await renderForm(ENTRY);
    await fireEvent.press(screen.getByTestId("delete-news-button"));
    await fireEvent.press(await waitFor(() => screen.getByTestId("delete-news-sheet-confirm")));
    await waitFor(() => {
      expect(mockedApiFetch).toHaveBeenCalledWith("/admin/changelog/news-1", { method: "DELETE" });
    });
    await view.unmount();
    await flush();
  });
});
