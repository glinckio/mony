import { fireEvent, render, screen, waitFor, within } from "@testing-library/react-native";
import type { ComponentProps } from "react";

import { ConfirmSheet } from "./ConfirmSheet";

function Sheet(props: Partial<ComponentProps<typeof ConfirmSheet>>) {
  return (
    <ConfirmSheet
      visible
      title='Excluir a meta "Viagem"?'
      message="O progresso guardado nela some junto."
      confirmLabel="Excluir meta"
      onConfirm={jest.fn()}
      onClose={jest.fn()}
      {...props}
    />
  );
}

const backdrop = () =>
  screen.getByTestId("confirm-sheet-backdrop", { includeHiddenElements: true });

describe("ConfirmSheet", () => {
  it("asks the question and runs the action or closes", async () => {
    const onConfirm = jest.fn();
    const onClose = jest.fn();
    await render(<Sheet onConfirm={onConfirm} onClose={onClose} />);

    expect(screen.getByText('Excluir a meta "Viagem"?')).toBeTruthy();
    expect(screen.getByText("O progresso guardado nela some junto.")).toBeTruthy();
    await fireEvent.press(screen.getByTestId("confirm-sheet-confirm"));
    await fireEvent.press(screen.getByTestId("confirm-sheet-cancel"));

    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("can't be closed or confirmed twice while the action runs", async () => {
    const onConfirm = jest.fn();
    const onClose = jest.fn();
    await render(<Sheet busy onConfirm={onConfirm} onClose={onClose} />);

    expect(screen.getByTestId("confirm-sheet-confirm").props.accessibilityState).toEqual({
      disabled: true,
      busy: true,
    });
    expect(screen.getByTestId("confirm-sheet-cancel").props.accessibilityState.disabled).toBe(true);
    await fireEvent.press(screen.getByTestId("confirm-sheet-confirm"));
    await fireEvent.press(screen.getByTestId("confirm-sheet-cancel"));
    await fireEvent.press(backdrop());
    await fireEvent(screen.getByTestId("confirm-sheet"), "requestClose");

    expect(onConfirm).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });

  it("shows a failure inside the sheet, without closing it", async () => {
    await render(<Sheet error="Não foi possível excluir. Tente novamente." />);

    expect(
      within(screen.getByTestId("confirm-sheet")).getByText(
        "Não foi possível excluir. Tente novamente.",
      ),
    ).toBeTruthy();
    expect(screen.getByTestId("confirm-sheet-confirm").props.accessibilityState.disabled).toBe(
      false,
    );
  });

  it("calls onDismissed only after it has left the screen", async () => {
    const onDismissed = jest.fn();
    const view = await render(<Sheet onDismissed={onDismissed} />);

    await view.rerender(<Sheet visible={false} onDismissed={onDismissed} />);
    expect(onDismissed).not.toHaveBeenCalled();

    await waitFor(() => {
      expect(onDismissed).toHaveBeenCalledTimes(1);
    });
    expect(screen.queryByTestId("confirm-sheet")).toBeNull();
  });
});
