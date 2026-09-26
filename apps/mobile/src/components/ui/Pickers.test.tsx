import { CATEGORY_COLORS, CATEGORY_ICONS } from "@mony/shared-types";
import { fireEvent, render, screen } from "@testing-library/react-native";

import { ColorPicker, IconPicker } from "./Pickers";

describe("ColorPicker", () => {
  it("reads each swatch as a pt-BR color name and marks the chosen one", async () => {
    await render(<ColorPicker testID="color-picker" value="#3B82F6" onChange={jest.fn()} />);

    const blue = screen.getByLabelText("Cor Azul");
    expect(blue.props.accessibilityRole).toBe("radio");
    expect(blue.props.accessibilityState).toEqual({ selected: true, checked: true });
    expect(screen.getByLabelText("Cor Vermelho").props.accessibilityState.selected).toBe(false);
  });

  it("never reads a hex code aloud", async () => {
    await render(<ColorPicker testID="color-picker" onChange={jest.fn()} />);

    for (const swatch of CATEGORY_COLORS) {
      const label: string = screen.getByTestId(`color-picker-${swatch}`).props.accessibilityLabel;
      expect(label).toMatch(/^Cor \S/);
      expect(label).not.toContain("#");
    }
  });

  it("reports the tapped color's hex value", async () => {
    const onChange = jest.fn();
    await render(<ColorPicker testID="color-picker" onChange={onChange} />);

    await fireEvent.press(screen.getByLabelText("Cor Verde-água"));

    expect(onChange).toHaveBeenCalledWith("#14B8A6");
  });
});

describe("IconPicker", () => {
  it("reads each icon by its pt-BR meaning, not the Ionicons name", async () => {
    await render(<IconPicker testID="icon-picker" value="car-outline" onChange={jest.fn()} />);

    for (const icon of CATEGORY_ICONS) {
      const label: string = screen.getByTestId(`icon-picker-${icon}`).props.accessibilityLabel;
      expect(label).toMatch(/^Ícone \S/);
      expect(label).not.toMatch(/outline|-/);
    }
    expect(screen.getByLabelText("Ícone Carro").props.accessibilityState.selected).toBe(true);
    expect(screen.getByLabelText("Ícone Restaurante").props.accessibilityState.selected).toBe(
      false,
    );
  });

  it("reports the tapped icon's key", async () => {
    const onChange = jest.fn();
    await render(<IconPicker testID="icon-picker" onChange={onChange} />);

    await fireEvent.press(screen.getByLabelText("Ícone Restaurante"));

    expect(onChange).toHaveBeenCalledWith("restaurant-outline");
  });
});
