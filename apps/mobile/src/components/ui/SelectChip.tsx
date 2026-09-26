import { StyleSheet, type StyleProp, type ViewStyle } from "react-native";

import { radius, space, useTheme } from "../../theme";

import { Icon, type IconName } from "./Icon";
import { Text } from "./Text";
import { Touchable } from "./Touchable";

interface SelectChipProps {
  label: string;
  selected: boolean;
  onPress: () => void;
  icon?: IconName;
  // The icon keeps the item's own color (a category's color).
  iconColor?: string;
  // Dashed outline: "none/automatic" options and "create" shortcuts.
  dashed?: boolean;
  disabled?: boolean;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

// Selectable chip: white pill with a soft shadow; the chosen one turns
// indigo-tinted with an indigo outline and label.
export function SelectChip({
  label,
  selected,
  onPress,
  icon,
  iconColor,
  dashed = false,
  disabled = false,
  accessibilityLabel,
  style,
  testID,
}: SelectChipProps) {
  const { colors, elevation } = useTheme();
  return (
    <Touchable
      testID={testID}
      feedback="sink"
      haptic="selection"
      accessibilityRole="radio"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ selected, checked: selected, disabled }}
      disabled={disabled}
      onPress={onPress}
      style={[
        styles.chip,
        selected
          ? { backgroundColor: colors.primaryMuted, borderColor: colors.primary, borderWidth: 1.5 }
          : dashed
            ? {
                backgroundColor: "transparent",
                borderColor: colors.borderStrong,
                borderWidth: 1,
                borderStyle: "dashed",
              }
            : {
                backgroundColor: colors.surface,
                borderColor: colors.border,
                borderWidth: 1,
                ...elevation("sm"),
              },
        disabled && styles.disabled,
        style,
      ]}
    >
      {icon ? (
        <Icon name={icon} size="sm" color={iconColor ?? colors.textMuted} filled={selected} />
      ) : null}
      <Text variant="subhead" color={selected ? colors.primary : colors.text} numberOfLines={1}>
        {label}
      </Text>
    </Touchable>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.sm,
    minHeight: 40,
    paddingHorizontal: space.lg,
    borderRadius: radius.full,
  },
  disabled: {
    opacity: 0.45,
  },
});
