import { color, radius, size as sizeTokens, spacing } from "@mony/ui-tokens";
import { StyleSheet, TouchableOpacity, View } from "react-native";

import { Text } from "./Text";

interface SegmentedToggleOption<T extends string> {
  value: T;
  label: string;
}

interface SegmentedToggleProps<T extends string> {
  options: Array<SegmentedToggleOption<T>>;
  value: T;
  onChange: (value: T) => void;
  disabled?: boolean;
  testID?: string;
}

export function SegmentedToggle<T extends string>({
  options,
  value,
  onChange,
  disabled = false,
  testID,
}: SegmentedToggleProps<T>) {
  return (
    <View style={styles.row} testID={testID}>
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <TouchableOpacity
            key={option.value}
            testID={testID ? `${testID}-${option.value}` : undefined}
            accessibilityRole="button"
            accessibilityState={{ selected, disabled }}
            disabled={disabled}
            style={[
              styles.option,
              selected && styles.optionSelected,
              disabled && styles.optionDisabled,
            ]}
            onPress={() => onChange(option.value)}
          >
            <Text variant="bodyStrong" color={selected ? color.onPrimary : color.textSecondary}>
              {option.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  option: {
    flex: 1,
    minHeight: sizeTokens.controlHeight,
    borderRadius: radius.md,
    backgroundColor: color.surfaceAlt,
    alignItems: "center",
    justifyContent: "center",
  },
  optionSelected: {
    backgroundColor: color.primary,
  },
  optionDisabled: {
    opacity: 0.6,
  },
});
