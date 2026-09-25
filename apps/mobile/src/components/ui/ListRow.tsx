import { Ionicons } from "@expo/vector-icons";
import { color, radius, size as sizeTokens, spacing } from "@mony/ui-tokens";
import { StyleSheet, TouchableOpacity, View } from "react-native";

import { Text } from "./Text";

interface ListRowProps {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  description?: string;
  onPress: () => void;
  testID?: string;
}

// Tappable menu row (icon + label + optional description + chevron) —
// e.g. the entries of the "Mais" tab.
export function ListRow({ label, icon, description, onPress, testID }: ListRowProps) {
  return (
    <TouchableOpacity
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={styles.row}
      onPress={onPress}
    >
      <View style={styles.iconBadge}>
        <Ionicons name={icon} size={sizeTokens.iconMd} color={color.primary} />
      </View>
      <View style={styles.text}>
        <Text variant="bodyStrong">{label}</Text>
        {description && <Text variant="caption">{description}</Text>}
      </View>
      <Ionicons name="chevron-forward" size={sizeTokens.iconMd} color={color.textSecondary} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    minHeight: sizeTokens.controlHeight,
    padding: spacing.md,
    backgroundColor: color.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: color.border,
  },
  iconBadge: {
    width: sizeTokens.touchTarget,
    height: sizeTokens.touchTarget,
    borderRadius: radius.md,
    backgroundColor: color.primaryMuted,
    alignItems: "center",
    justifyContent: "center",
  },
  text: {
    flex: 1,
    gap: spacing.xxs,
  },
});
