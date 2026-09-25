import { Ionicons } from "@expo/vector-icons";
import { color, size as sizeTokens, spacing } from "@mony/ui-tokens";
import { StyleSheet, TouchableOpacity, View } from "react-native";

import { Text } from "./Text";
import { WorkspaceSwitcher } from "./WorkspaceSwitcher";

interface AppHeaderProps {
  title: string;
  rightAccessory?: React.ReactNode;
  // Screens pushed on the app stack (not tabs) have no native header —
  // this renders their back affordance.
  onBack?: () => void;
}

// Shared header for every screen in the authenticated app stack — always
// carries the workspace switcher, since it applies everywhere (see
// design.md). `rightAccessory` is for a per-screen action, e.g. Home's
// link to Profile.
export function AppHeader({ title, rightAccessory, onBack }: AppHeaderProps) {
  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <View style={styles.titleRow}>
          {onBack && (
            <TouchableOpacity
              testID="header-back"
              accessibilityRole="button"
              accessibilityLabel="Voltar"
              hitSlop={8}
              onPress={onBack}
            >
              <Ionicons name="chevron-back" size={sizeTokens.iconLg} color={color.textPrimary} />
            </TouchableOpacity>
          )}
          <Text variant="heading" style={styles.title} numberOfLines={1}>
            {title}
          </Text>
        </View>
        {rightAccessory}
      </View>
      <WorkspaceSwitcher />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  titleRow: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  title: {
    flexShrink: 1,
  },
});
