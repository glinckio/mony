import type { AdminChangelogEntry } from "@mony/shared-types";
import { NavigationContainer, useNavigation } from "@react-navigation/native";
import {
  createNativeStackNavigator,
  type NativeStackNavigationProp,
} from "@react-navigation/native-stack";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import { Text, TouchableOpacity, View } from "react-native";

import { ApiError, apiFetch } from "../../lib/api-client";
import { useToastStore } from "../../lib/toast-store";

import { NewsFormScreen } from "./NewsFormScreen";

// Failure paths of the admin form: every API error is turned into the app's
// own pt-BR copy (never the API's English message), the form stays open,
// and deleting asks first. Kept apart from NewsFormScreen.test.tsx (see
// the RHF/TanStack note in docs/steering/tech.md).

jest.mock("../../lib/api-client", () => {
  class MockApiError extends Error {
    statusCode: number;
    constructor(statusCode: number, message = "api error") {
      super(message);
      this.statusCode = statusCode;
    }
  }
  return { apiFetch: jest.fn(), ApiError: MockApiError };
});

const mockedApiFetch = apiFetch as jest.Mock;
const MockedApiError = ApiError as unknown as new (statusCode: number, message?: string) => Error;

type TestStack = { Home: undefined; NewsForm: { entry?: AdminChangelogEntry } | undefined };
const Stack = createNativeStackNavigator<TestStack>();

const ENTRY: AdminChangelogEntry = {
  id: "news-1",
  title: "Relatórios chegaram",
  description: "Resumo do período.",
  videoId: null,
  publishedAt: "2026-09-29T12:00:00.000Z",
  expiresAt: null,
  status: "ACTIVE",
  readCount: 3,
  authorName: "Equipe Mony",
};

// A real screen underneath the form, so "saved -> back" is observable.
function Home() {
  const navigation = useNavigation<NativeStackNavigationProp<TestStack>>();
  return (
    <View>
      <Text>Lista de novidades</Text>
      <TouchableOpacity testID="open-new" onPress={() => navigation.navigate("NewsForm")}>
        <Text>Nova</Text>
      </TouchableOpacity>
      <TouchableOpacity
        testID="open-edit"
        onPress={() => navigation.navigate("NewsForm", { entry: ENTRY })}
      >
        <Text>Editar</Text>
      </TouchableOpacity>
    </View>
  );
}

async function openForm(which: "open-new" | "open-edit") {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  const view = await render(
    <QueryClientProvider client={queryClient}>
      <NavigationContainer>
        <Stack.Navigator screenOptions={{ headerShown: false, animation: "none" }}>
          <Stack.Screen name="Home" component={Home} />
          <Stack.Screen name="NewsForm" component={NewsFormScreen} />
        </Stack.Navigator>
      </NavigationContainer>
    </QueryClientProvider>,
  );
  await fireEvent.press(screen.getByTestId(which));
  await waitFor(() => {
    expect(screen.getByTestId("submit-button")).toBeTruthy();
  });
  return view;
}

async function fillNew() {
  await fireEvent.changeText(screen.getByTestId("title-input"), "Relatórios chegaram");
  await fireEvent.changeText(screen.getByTestId("description-input"), "Resumo do período.");
}

const flush = () => new Promise<void>((resolve) => setTimeout(resolve, 50));

describe("NewsFormScreen failures", () => {
  beforeEach(() => {
    mockedApiFetch.mockReset();
    useToastStore.getState().hide();
  });

  it("tells a non-admin they can't publish (403), keeping the form", async () => {
    mockedApiFetch.mockRejectedValue(new MockedApiError(403, "Admins only."));
    const view = await openForm("open-new");
    await fillNew();
    await fireEvent.press(screen.getByTestId("submit-button"));
    await waitFor(() => {
      expect(screen.getByText("Só administradores podem mexer nas novidades.")).toBeTruthy();
    });
    expect(screen.queryByText("Admins only.")).toBeNull();
    expect(screen.getByDisplayValue("Relatórios chegaram")).toBeTruthy();
    await view.unmount();
    await flush();
  });

  it("says the entry is gone when an edit answers 404", async () => {
    mockedApiFetch.mockRejectedValue(new MockedApiError(404, "Changelog entry not found."));
    const view = await openForm("open-edit");
    await fireEvent.press(screen.getByTestId("submit-button"));
    await waitFor(() => {
      expect(screen.getByText("Essa novidade não existe mais.")).toBeTruthy();
    });
    expect(screen.queryByText("Changelog entry not found.")).toBeNull();
    await view.unmount();
    await flush();
  });

  it("falls back to the generic copy for anything else", async () => {
    mockedApiFetch.mockRejectedValue(
      new MockedApiError(400, "videoUrl must be a YouTube video link."),
    );
    const view = await openForm("open-new");
    await fillNew();
    await fireEvent.press(screen.getByTestId("submit-button"));
    await waitFor(() => {
      expect(screen.getByTestId("news-form-error")).toBeTruthy();
    });
    expect(screen.getByText("Algo deu errado. Tente novamente.")).toBeTruthy();
    expect(screen.queryByText("videoUrl must be a YouTube video link.")).toBeNull();
    await view.unmount();
    await flush();
  });

  it("won't send a half-typed expiry date", async () => {
    const view = await openForm("open-new");
    await fillNew();
    await fireEvent.changeText(screen.getByTestId("expires-input"), "3112");
    await fireEvent.press(screen.getByTestId("submit-button"));
    await waitFor(() => {
      expect(screen.getByText("Data inválida.")).toBeTruthy();
    });
    expect(mockedApiFetch).not.toHaveBeenCalled();
    await view.unmount();
    await flush();
  });

  it("asks before deleting: cancelling deletes nothing, a failure keeps the form", async () => {
    mockedApiFetch.mockRejectedValue(new MockedApiError(404));
    const view = await openForm("open-edit");

    await fireEvent.press(screen.getByTestId("delete-news-button"));
    await fireEvent.press(await waitFor(() => screen.getByTestId("delete-news-sheet-cancel")));
    await flush();
    expect(mockedApiFetch).not.toHaveBeenCalled();

    await fireEvent.press(screen.getByTestId("delete-news-button"));
    await fireEvent.press(await waitFor(() => screen.getByTestId("delete-news-sheet-confirm")));
    await waitFor(() => {
      expect(screen.getByText("Essa novidade não existe mais.")).toBeTruthy();
    });
    expect(mockedApiFetch).toHaveBeenCalledWith("/admin/changelog/news-1", { method: "DELETE" });
    expect(screen.getByTestId("submit-button")).toBeTruthy();
    await view.unmount();
    await flush();
  });

  it("closes with a success toast once published", async () => {
    mockedApiFetch.mockResolvedValue(ENTRY);
    const view = await openForm("open-new");
    await fillNew();
    await fireEvent.press(screen.getByTestId("submit-button"));
    await waitFor(() => {
      expect(screen.queryByTestId("submit-button")).toBeNull();
    });
    expect(screen.getByText("Lista de novidades")).toBeTruthy();
    expect(useToastStore.getState()).toMatchObject({
      message: "Novidade publicada.",
      tone: "success",
    });
    await view.unmount();
    await flush();
  });
});
