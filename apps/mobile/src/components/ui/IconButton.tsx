import { Ionicons } from "@expo/vector-icons";
import { color, radius, size as sizeTokens } from "@mony/ui-tokens";
import { StyleSheet, TouchableOpacity } from "react-native";

interface IconButtonProps {
  icon: keyof typeof Ionicons.glyphMap;
  // Required — an icon-only control has no visible text for screen readers.
  accessibilityLabel: string;
  onPress: () => void;
  disabled?: boolean;
  testID?: string;
}

// Square, touch-target-sized icon control on a `primaryMuted` fill — e.g.
// the grocery list's quick −/+ stepper. For bare header icons (add, edit,
// share) screens keep using a plain `TouchableOpacity` + `hitSlop`.
export function IconButton({
  icon,
  accessibilityLabel,
  onPress,
  disabled = false,
  testID,
}: IconButtonProps) {
  return (
    <TouchableOpacity
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled }}
      disabled={disabled}
      style={[styles.button, disabled && styles.disabled]}
      onPress={onPress}
    >
      <Ionicons name={icon} size={sizeTokens.iconMd} color={color.primary} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    width: sizeTokens.touchTarget,
    height: sizeTokens.touchTarget,
    borderRadius: radius.md,
    backgroundColor: color.primaryMuted,
    alignItems: "center",
    justifyContent: "center",
  },
  // Same disabled treatment as `Button`.
  disabled: {
    opacity: 0.5,
  },
});
