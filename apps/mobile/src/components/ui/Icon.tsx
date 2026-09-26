import { Ionicons } from "@expo/vector-icons";
import type { ComponentProps } from "react";

import { iconSize, useTheme } from "../../theme";

export type IconName = ComponentProps<typeof Ionicons>["name"];

interface IconProps {
  name: IconName;
  size?: keyof typeof iconSize | number;
  color?: string;
  // Swaps an `-outline` glyph for its filled twin (active tab, selection).
  filled?: boolean;
  testID?: string;
}

// One icon family for the whole app (Ionicons — category icons are stored
// as Ionicons glyph names). Decorative by default: the control around it
// carries the accessible label.
export function Icon({ name, size = "md", color, filled = false, testID }: IconProps) {
  const { colors } = useTheme();
  const glyph = filled ? (name.replace(/-outline$/, "") as IconName) : name;
  return (
    <Ionicons
      name={glyph}
      size={typeof size === "number" ? size : iconSize[size]}
      color={color ?? colors.text}
      testID={testID}
      accessibilityElementsHidden
      importantForAccessibility="no"
    />
  );
}
