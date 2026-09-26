import type { Category, Transaction } from "@mony/shared-types";
import { fireEvent, render, screen } from "@testing-library/react-native";

import { TransactionItem } from "./TransactionItem";

const BILL: Transaction = {
  id: "tx-1",
  categoryId: "cat-1",
  workspace: "PERSONAL",
  type: "EXPENSE",
  status: "PENDING",
  description: "Conta de luz",
  amount: "150.00",
  date: "2026-09-10",
  recurring: false,
  createdAt: "2026-09-10T12:00:00.000Z",
  updatedAt: "2026-09-10T12:00:00.000Z",
};

const SALARY: Transaction = {
  ...BILL,
  id: "tx-2",
  categoryId: "cat-2",
  type: "INCOME",
  status: "PAID",
  description: "Salário",
  amount: "5000.00",
};

const BILLS: Category = {
  id: "cat-1",
  name: "Contas",
  type: "EXPENSE",
  color: "#3B82F6",
  icon: "receipt-outline",
  createdAt: "2026-01-15T12:00:00.000Z",
};

function callbacks() {
  return {
    onOpen: jest.fn(),
    onToggleSelect: jest.fn(),
    onToggleStatus: jest.fn(),
    onRequestDelete: jest.fn(),
  };
}

const row = (id = BILL.id) => screen.getByTestId(`transaction-row-${id}`);
const actionNames = (id?: string) =>
  (row(id).props.accessibilityActions as Array<{ name: string; label: string }>).map(
    (action) => action.name,
  );
const accessibilityAction = (actionName: string, id?: string) =>
  fireEvent(row(id), "accessibilityAction", { nativeEvent: { actionName } });

describe("TransactionItem", () => {
  it("reads the whole entry aloud and opens it on press", async () => {
    const handlers = callbacks();
    await render(<TransactionItem transaction={BILL} category={BILLS} {...handlers} />);

    expect(row().props.accessibilityLabel).toBe(
      "Conta de luz, despesa de 150 reais, Contas, a pagar",
    );
    await fireEvent.press(row());

    expect(handlers.onOpen).toHaveBeenCalledWith(BILL);
    expect(handlers.onToggleSelect).not.toHaveBeenCalled();
  });

  it("offers screen readers 'Marcar como pago' on an expense to pay", async () => {
    const handlers = callbacks();
    await render(<TransactionItem transaction={BILL} category={BILLS} {...handlers} />);

    expect(row().props.accessibilityActions).toContainEqual({
      name: "toggleStatus",
      label: "Marcar como pago",
    });
    await accessibilityAction("toggleStatus");

    expect(handlers.onToggleStatus).toHaveBeenCalledWith(BILL);
  });

  it("offers 'Marcar como pendente' on a paid expense, and toggles from the pill too", async () => {
    const handlers = callbacks();
    const paid = { ...BILL, status: "PAID" as const };
    await render(<TransactionItem transaction={paid} category={BILLS} {...handlers} />);

    expect(row().props.accessibilityActions).toContainEqual({
      name: "toggleStatus",
      label: "Marcar como pendente",
    });
    expect(screen.getByText("Pago")).toBeTruthy();
    await fireEvent.press(screen.getByLabelText("Marcar como pendente"));

    expect(handlers.onToggleStatus).toHaveBeenCalledWith(paid);
    expect(handlers.onOpen).not.toHaveBeenCalled();
  });

  it("has no paid / to-pay toggle on an income", async () => {
    const handlers = callbacks();
    await render(<TransactionItem transaction={SALARY} {...handlers} />);

    expect(actionNames(SALARY.id)).toEqual(["longpress", "delete"]);
    expect(screen.queryByTestId(`toggle-status-${SALARY.id}`)).toBeNull();
    await accessibilityAction("toggleStatus", SALARY.id);

    expect(handlers.onToggleStatus).not.toHaveBeenCalled();
  });

  it("selects and deletes through the screen-reader actions", async () => {
    const handlers = callbacks();
    await render(<TransactionItem transaction={BILL} category={BILLS} {...handlers} />);

    expect(actionNames()).toEqual(["longpress", "toggleStatus", "delete"]);
    await accessibilityAction("longpress");
    await accessibilityAction("delete");

    expect(handlers.onToggleSelect).toHaveBeenCalledWith("tx-1");
    expect(handlers.onRequestDelete).toHaveBeenCalledWith("tx-1");
  });

  it("in selection mode, a press selects and the status toggle is gone", async () => {
    const handlers = callbacks();
    await render(
      <TransactionItem transaction={BILL} category={BILLS} selectionMode selected {...handlers} />,
    );

    expect(row().props.accessibilityState.selected).toBe(true);
    expect(actionNames()).not.toContain("toggleStatus");
    await fireEvent.press(row());
    await accessibilityAction("toggleStatus");
    await fireEvent.press(screen.getByTestId("toggle-status-tx-1"));

    expect(handlers.onToggleSelect).toHaveBeenCalledWith("tx-1");
    expect(handlers.onOpen).not.toHaveBeenCalled();
    expect(handlers.onToggleStatus).not.toHaveBeenCalled();
  });

  it("as a compact miniature, has no actions at all", async () => {
    const handlers = callbacks();
    await render(<TransactionItem transaction={BILL} category={BILLS} compact {...handlers} />);

    expect(screen.queryByTestId("transaction-row-tx-1")).toBeNull();
    expect(screen.queryByTestId("toggle-status-tx-1")).toBeNull();
    expect(screen.getByText("Conta de luz")).toBeTruthy();
    expect(screen.getByText("A pagar")).toBeTruthy();
  });
});
