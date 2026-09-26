import type { Category } from "@mony/shared-types";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react-native";

import { ApiError, apiFetch } from "../../lib/api-client";
import { queryClient } from "../../lib/query-client";

import { CategoriesScreen } from "./CategoriesScreen";

jest.mock("../../lib/api-client", () => ({
  apiFetch: jest.fn(),
  ApiError: class ApiError extends Error {
    statusCode: number;
    body: unknown;
    constructor(statusCode: number, body: unknown) {
      super("api error");
      this.statusCode = statusCode;
      this.body = body;
    }
  },
}));

const mockedApiFetch = apiFetch as jest.Mock;

const Stack = createNativeStackNavigator();

const FOOD: Category = {
  id: "cat-food",
  name: "Alimentação",
  type: "EXPENSE",
  color: "#EF4444",
  icon: "restaurant-outline",
  createdAt: "2026-01-15T12:00:00.000Z",
};
const MARKET: Category = { ...FOOD, id: "cat-market", name: "Mercado", icon: "bag-outline" };
const SALARY: Category = {
  ...FOOD,
  id: "cat-salary",
  name: "Salário",
  type: "INCOME",
  icon: "cash-outline",
};

const apiError = (statusCode: number, message: string) =>
  new ApiError(statusCode, {
    statusCode,
    error: statusCode === 400 ? "BAD_REQUEST" : "INTERNAL_SERVER_ERROR",
    message: [message],
    path: "/categories/cat-food",
    timestamp: "2026-09-26T12:00:00.000Z",
  });

// The server's category list, which a successful DELETE changes.
let serverCategories: Category[];

function mockApi({ onDelete }: { onDelete: (path: string) => Promise<unknown> }) {
  mockedApiFetch.mockImplementation((path: string, init?: { method?: string }) => {
    if (path === "/categories" && !init?.method) return Promise.resolve(serverCategories);
    if (init?.method === "DELETE") return onDelete(path);
    return Promise.reject(new Error(`unexpected ${path}`));
  });
}

function deferred() {
  let reject!: (error: unknown) => void;
  let resolve!: (value?: unknown) => void;
  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

function renderScreen() {
  return render(
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false, animation: "none" }}>
        <Stack.Screen name="Categories" component={CategoriesScreen} />
      </Stack.Navigator>
    </NavigationContainer>,
  );
}

const deleteCalls = () =>
  mockedApiFetch.mock.calls.filter(([, init]) => init?.method === "DELETE").map(([path]) => path);

// Opens the confirm sheet for "Alimentação" and confirms it.
async function confirmDeleteFood() {
  await waitFor(() => {
    expect(screen.getByTestId("category-row-cat-food")).toBeTruthy();
  });
  await fireEvent.press(screen.getByLabelText("Excluir Alimentação"));
  expect(screen.getByText('Excluir a categoria "Alimentação"?')).toBeTruthy();
  await fireEvent.press(screen.getByTestId("confirm-sheet-confirm"));
}

describe("CategoriesScreen", () => {
  beforeEach(() => {
    mockedApiFetch.mockReset();
    serverCategories = [FOOD, MARKET, SALARY];
  });

  it("lists expense and income categories in their own sections", async () => {
    mockApi({ onDelete: () => Promise.resolve(undefined) });
    const view = await renderScreen();

    await waitFor(() => {
      expect(screen.getByTestId("category-row-cat-food")).toBeTruthy();
    });
    expect(within(screen.getByTestId("category-row-cat-market")).getByText("Mercado")).toBeTruthy();
    expect(within(screen.getByTestId("category-row-cat-salary")).getByText("Salário")).toBeTruthy();
    expect(screen.getByText("Despesas")).toBeTruthy();
    expect(screen.getByText("Receitas")).toBeTruthy();
    view.unmount();
  });

  it("deletes a category that isn't in use once confirmed", async () => {
    mockApi({
      onDelete: () => {
        serverCategories = [MARKET, SALARY];
        return Promise.resolve(undefined);
      },
    });
    const invalidate = jest.spyOn(queryClient, "invalidateQueries");
    const view = await renderScreen();

    await confirmDeleteFood();

    await waitFor(() => {
      expect(screen.queryByTestId("category-row-cat-food")).toBeNull();
    });
    expect(deleteCalls()).toEqual(["/categories/cat-food"]);
    expect(screen.queryByTestId("replacement-prompt")).toBeNull();
    // Cached pickers (the transaction form's) drop the deleted category.
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ["categories"] });
    invalidate.mockRestore();
    view.unmount();
  });

  // iOS can't present a second Modal while the first is still on screen.
  it("asks for a replacement only after the confirm sheet has left the screen (400: in use)", async () => {
    const deletion = deferred();
    mockApi({ onDelete: () => deletion.promise });
    const view = await renderScreen();

    await confirmDeleteFood();
    // Busy: the sheet can't be dismissed while the request runs.
    expect(screen.getByTestId("confirm-sheet-cancel").props.accessibilityState.disabled).toBe(true);

    await act(async () => {
      deletion.reject(apiError(400, "Category has transactions; replacementCategoryId required"));
    });

    // The confirm sheet is sliding away — the replacement one waits for it.
    expect(screen.getByTestId("confirm-sheet")).toBeTruthy();
    expect(screen.queryByTestId("replacement-prompt")).toBeNull();

    await waitFor(() => {
      expect(screen.getByTestId("replacement-prompt")).toBeTruthy();
    });
    expect(screen.queryByTestId("confirm-sheet")).toBeNull();
    expect(screen.getByText("Categoria em uso")).toBeTruthy();
    expect(screen.getByText(/"Alimentação" está em uso/)).toBeTruthy();
    // Only other categories of the same type can take its transactions.
    expect(screen.getByLabelText("Mover para Mercado")).toBeTruthy();
    expect(screen.queryByTestId("replacement-option-cat-food")).toBeNull();
    expect(screen.queryByTestId("replacement-option-cat-salary")).toBeNull();
    expect(screen.queryByText(/replacementCategoryId/)).toBeNull();
    view.unmount();
  });

  it("moves the transactions to the chosen replacement and deletes the category", async () => {
    mockApi({
      onDelete: (path) => {
        if (path === "/categories/cat-food") {
          return Promise.reject(apiError(400, "Category has transactions"));
        }
        serverCategories = [MARKET, SALARY];
        return Promise.resolve(undefined);
      },
    });
    const view = await renderScreen();

    await confirmDeleteFood();
    await waitFor(() => {
      expect(screen.getByTestId("replacement-prompt")).toBeTruthy();
    });
    await fireEvent.press(screen.getByTestId("replacement-option-cat-market"));

    await waitFor(() => {
      expect(screen.queryByTestId("category-row-cat-food")).toBeNull();
    });
    expect(deleteCalls()).toEqual([
      "/categories/cat-food",
      "/categories/cat-food?replacementCategoryId=cat-market",
    ]);
    await waitFor(() => {
      expect(screen.queryByTestId("replacement-prompt")).toBeNull();
    });
    expect(screen.getByTestId("category-row-cat-market")).toBeTruthy();
    view.unmount();
  });

  it("keeps the category when the replacement prompt is cancelled", async () => {
    mockApi({ onDelete: () => Promise.reject(apiError(400, "Category has transactions")) });
    const view = await renderScreen();

    await confirmDeleteFood();
    await waitFor(() => {
      expect(screen.getByTestId("replacement-prompt")).toBeTruthy();
    });
    await fireEvent.press(screen.getByTestId("cancel-replacement"));

    await waitFor(() => {
      expect(screen.queryByTestId("replacement-prompt")).toBeNull();
    });
    expect(deleteCalls()).toEqual(["/categories/cat-food"]);
    expect(screen.getByTestId("category-row-cat-food")).toBeTruthy();
    view.unmount();
  });

  it("shows generic pt-BR copy, never the API message, when deleting fails otherwise", async () => {
    mockApi({ onDelete: () => Promise.reject(apiError(500, "Internal server error")) });
    const view = await renderScreen();

    await confirmDeleteFood();

    await waitFor(() => {
      expect(screen.getByText("Algo deu errado. Tente novamente.")).toBeTruthy();
    });
    await waitFor(() => {
      expect(screen.queryByTestId("confirm-sheet")).toBeNull();
    });
    expect(screen.queryByTestId("replacement-prompt")).toBeNull();
    expect(screen.queryByText(/Internal server error/)).toBeNull();
    expect(screen.getByTestId("category-row-cat-food")).toBeTruthy();
    view.unmount();
  });
});
