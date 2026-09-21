import { Ionicons } from "@expo/vector-icons";
import { CATEGORY_COLORS } from "@mony/shared-types";
import { color as colorTokens, radius, size as sizeTokens, spacing } from "@mony/ui-tokens";
import { StyleSheet, TouchableOpacity, View } from "react-native";

interface ColorSwatchPickerProps {
  value?: string;
  onChange: (value: string) => void;
  testID?: string;
}

export function ColorSwatchPicker({ value, onChange, testID }: ColorSwatchPickerProps) {
  return (
    <View style={styles.row} testID={testID}>
      {CATEGORY_COLORS.map((swatch) => {
        const selected = swatch === value;
        return (
          <TouchableOpacity
            key={swatch}
            testID={testID ? `${testID}-${swatch}` : undefined}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            style={[styles.swatch, { backgroundColor: swatch }]}
            onPress={() => onChange(swatch)}
          >
            {selected && (
              <Ionicons name="checkmark" size={sizeTokens.iconMd} color={colorTokens.onPrimary} />
            )}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  swatch: {
    width: sizeTokens.touchTarget,
    height: sizeTokens.touchTarget,
    borderRadius: radius.xl,
    alignItems: "center",
    justifyContent: "center",
  },
});
