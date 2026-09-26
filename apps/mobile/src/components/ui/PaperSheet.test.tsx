import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import { Text } from "react-native";

import { PaperSheet } from "./PaperSheet";

function Sheet({
  visible,
  onClose = jest.fn(),
  onDismissed,
  dismissible,
  title = "Pagar parcela 1",
  body = "R$ 1.000,00",
}: {
  visible: boolean;
  onClose?: () => void;
  onDismissed?: () => void;
  dismissible?: boolean;
  title?: string;
  body?: string | null;
}) {
  return (
    <PaperSheet
      testID="sheet"
      visible={visible}
      onClose={onClose}
      onDismissed={onDismissed}
      dismissible={dismissible}
      title={title}
    >
      {body ? <Text>{body}</Text> : null}
    </PaperSheet>
  );
}

// The backdrop fades in from opacity 0, which the test renderer never
// advances — RNTL counts it as hidden until then.
const backdrop = () => screen.getByTestId("sheet-backdrop", { includeHiddenElements: true });

describe("PaperSheet", () => {
  it("closes from the backdrop, the close button and Android back", async () => {
    const onClose = jest.fn();
    await render(<Sheet visible onClose={onClose} />);

    await fireEvent.press(backdrop());
    await fireEvent.press(screen.getByTestId("sheet-close"));
    // Android back button / iOS dismiss gesture on the Modal.
    await fireEvent(screen.getByTestId("sheet"), "requestClose");

    expect(onClose).toHaveBeenCalledTimes(3);
  });

  it("can't be closed while not dismissible (an action is running)", async () => {
    const onClose = jest.fn();
    await render(<Sheet visible dismissible={false} onClose={onClose} />);

    expect(screen.getByTestId("sheet-close").props.accessibilityState.disabled).toBe(true);
    await fireEvent.press(backdrop());
    await fireEvent.press(screen.getByTestId("sheet-close"));
    await fireEvent(screen.getByTestId("sheet"), "requestClose");

    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByText("Pagar parcela 1")).toBeTruthy();
  });

  it("keeps the last content while sliding away, then calls onDismissed once it's gone", async () => {
    const onDismissed = jest.fn();
    const view = await render(<Sheet visible onDismissed={onDismissed} />);

    // The parent clears what the sheet was showing in the same update
    // that closes it (`title={item ? … : ""}`).
    await view.rerender(<Sheet visible={false} onDismissed={onDismissed} title="" body={null} />);

    // Still on screen for the exit animation, with the old content.
    expect(screen.getByTestId("sheet")).toBeTruthy();
    expect(screen.getByText("Pagar parcela 1")).toBeTruthy();
    expect(screen.getByText("R$ 1.000,00")).toBeTruthy();
    expect(onDismissed).not.toHaveBeenCalled();

    await waitFor(() => {
      expect(onDismissed).toHaveBeenCalledTimes(1);
    });
    expect(screen.queryByTestId("sheet")).toBeNull();
  });

  it("doesn't call onDismissed if it reopens before the exit animation ends", async () => {
    const onDismissed = jest.fn();
    const view = await render(<Sheet visible onDismissed={onDismissed} />);

    await view.rerender(<Sheet visible={false} onDismissed={onDismissed} />);
    await view.rerender(<Sheet visible onDismissed={onDismissed} title="Pagar parcela 2" />);
    await new Promise<void>((resolve) => setTimeout(resolve, 400));

    expect(onDismissed).not.toHaveBeenCalled();
    expect(screen.getByText("Pagar parcela 2")).toBeTruthy();
  });

  it("never calls onDismissed for a sheet that was never opened", async () => {
    const onDismissed = jest.fn();
    const view = await render(<Sheet visible={false} onDismissed={onDismissed} />);

    expect(screen.queryByTestId("sheet")).toBeNull();
    await view.rerender(<Sheet visible={false} onDismissed={onDismissed} title="Outro" />);
    await new Promise<void>((resolve) => setTimeout(resolve, 400));

    expect(onDismissed).not.toHaveBeenCalled();
  });
});
