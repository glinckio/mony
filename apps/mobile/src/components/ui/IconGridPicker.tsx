import { Ionicons } from "@expo/vector-icons";
import { CATEGORY_ICONS, type CategoryIcon } from "@mony/shared-types";
import { color, radius, size as sizeTokens, spacing } from "@mony/ui-tokens";
import { StyleSheet, TouchableOpacity, View } from "react-native";

interface IconGridPickerProps {
  value?: string;
  onChange: (value: CategoryIcon) => void;
  testID?: string;
}

export function IconGridPicker({ value, onChange, testID }: IconGridPickerProps) {
  return (
    <View style={styles.grid} testID={testID}>
      {CATEGORY_ICONS.map((icon) => {
        const selected = icon === value;
        return (
          <TouchableOpacity
            key={icon}
            testID={testID ? `${testID}-${icon}` : undefined}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            style={[styles.cell, selected && styles.cellSelected]}
            onPress={() => onChange(icon)}
          >
            <Ionicons
              name={icon}
              size={sizeTokens.iconLg}
              color={selected ? color.onPrimary : color.textSecondary}
            />
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  cell: {
    width: sizeTokens.touchTarget,
    height: sizeTokens.touchTarget,
    borderRadius: radius.md,
    backgroundColor: color.surfaceAlt,
    alignItems: "center",
    justifyContent: "center",
  },
  cellSelected: {
    backgroundColor: color.primary,
  },
});
