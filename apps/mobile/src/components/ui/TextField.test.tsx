import { fireEvent, render, screen } from "@testing-library/react-native";
import { StyleSheet } from "react-native";

import { TextField } from "./TextField";

const SHADOW_KEYS = ["elevation", "shadowColor", "shadowOffset", "shadowOpacity", "shadowRadius"];

// The style keys of the field box (the input's parent) that draw a shadow.
function shadowKeys(): string[] {
  const field = screen.getByTestId("field").parent!;
  const style = StyleSheet.flatten(field.props.style) as Record<string, unknown>;
  return SHADOW_KEYS.filter((key) => style[key] !== undefined).sort();
}

describe("TextField", () => {
  // Regression: shadow props that only appeared on focus made Android (New
  // Architecture) rebuild the input's parent, dropping the focus at once —
  // the keyboard never opened on the login screen.
  it("keeps the same shadow props on the field focused or not", async () => {
    const view = await render(<TextField testID="field" label="E-mail" />);
    const resting = shadowKeys();
    expect(resting.length).toBeGreaterThan(0);

    await fireEvent(screen.getByTestId("field"), "focus");
    expect(shadowKeys()).toEqual(resting);

    await fireEvent(screen.getByTestId("field"), "blur");
    expect(shadowKeys()).toEqual(resting);
    await view.unmount();
  });
});
