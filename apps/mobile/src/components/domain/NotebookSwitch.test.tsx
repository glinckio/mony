import { act, fireEvent, render, screen, waitFor } from "@testing-library/react-native";

import { apiFetch } from "../../lib/api-client";
import { queryClient } from "../../lib/query-client";
import { useToastStore } from "../../lib/toast-store";
import { useWorkspaceStore } from "../../lib/workspace-store";

import { NotebookSwitch } from "./NotebookSwitch";

jest.mock("../../lib/api-client", () => ({
  apiFetch: jest.fn(),
  ApiError: class ApiError extends Error {},
}));

const mockedApiFetch = apiFetch as jest.Mock;

const DASHBOARD_KEY = ["dashboard", "month", "", ""];
const TRANSACTIONS_KEY = ["transactions", { typeFilter: "ALL", search: "" }];

const selected = (workspace: "PERSONAL" | "BUSINESS") =>
  screen.getByTestId(`workspace-option-${workspace}`).props.accessibilityState.selected;

describe("NotebookSwitch", () => {
  beforeEach(() => {
    mockedApiFetch.mockReset();
    queryClient.clear();
    useToastStore.getState().hide();
    useWorkspaceStore.setState({ activeWorkspace: "PERSONAL" });
    // Per-notebook data already on screen.
    queryClient.setQueryData(DASHBOARD_KEY, { summary: {} });
    queryClient.setQueryData(TRANSACTIONS_KEY, { pages: [] });
  });

  afterAll(() => {
    queryClient.clear();
  });

  it("switches notebooks and refetches every per-notebook query", async () => {
    mockedApiFetch.mockResolvedValue({ activeWorkspace: "BUSINESS" });
    await render(<NotebookSwitch />);

    await fireEvent.press(screen.getByLabelText("Caderno empresarial"));

    await waitFor(() => {
      expect(queryClient.getQueryState(DASHBOARD_KEY)?.isInvalidated).toBe(true);
    });
    expect(queryClient.getQueryState(TRANSACTIONS_KEY)?.isInvalidated).toBe(true);
    expect(mockedApiFetch).toHaveBeenCalledWith("/users/me/workspace", {
      method: "PATCH",
      body: JSON.stringify({ workspace: "BUSINESS" }),
    });
    expect(useWorkspaceStore.getState().activeWorkspace).toBe("BUSINESS");
    expect(selected("BUSINESS")).toBe(true);
    expect(useToastStore.getState().message).toBeNull();
  });

  it("moves at once, and back with a pt-BR toast when the switch fails", async () => {
    let rejectSwitch!: (error: unknown) => void;
    mockedApiFetch.mockImplementation(
      () =>
        new Promise((_resolve, reject) => {
          rejectSwitch = reject;
        }),
    );
    await render(<NotebookSwitch />);

    await fireEvent.press(screen.getByTestId("workspace-option-BUSINESS"));
    // Optimistic.
    expect(useWorkspaceStore.getState().activeWorkspace).toBe("BUSINESS");

    await act(async () => {
      rejectSwitch(new Error("workspace must be one of the following values"));
    });

    await waitFor(() => {
      expect(useWorkspaceStore.getState().activeWorkspace).toBe("PERSONAL");
    });
    expect(useToastStore.getState().message).toBe(
      "Não foi possível trocar de caderno. Tente novamente.",
    );
    // Nothing changed server-side: the cached data stays valid.
    expect(queryClient.getQueryState(DASHBOARD_KEY)?.isInvalidated).toBe(false);
    expect(queryClient.getQueryState(TRANSACTIONS_KEY)?.isInvalidated).toBe(false);
  });

  it("does nothing when the active notebook is tapped again", async () => {
    await render(<NotebookSwitch />);

    await fireEvent.press(screen.getByTestId("workspace-option-PERSONAL"));

    expect(mockedApiFetch).not.toHaveBeenCalled();
    expect(queryClient.getQueryState(DASHBOARD_KEY)?.isInvalidated).toBe(false);
  });
});
