import { spacing } from "@mony/ui-tokens";
import { StyleSheet, View } from "react-native";

import { Text } from "./Text";
import { WorkspaceSwitcher } from "./WorkspaceSwitcher";

interface AppHeaderProps {
  title: string;
  rightAccessory?: React.ReactNode;
}

// Shared header for every screen in the authenticated app stack — always
// carries the workspace switcher, since it applies everywhere (see
// design.md). `rightAccessory` is for a per-screen action, e.g. Home's
// link to Profile.
export function AppHeader({ title, rightAccessory }: AppHeaderProps) {
  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <Text variant="heading">{title}</Text>
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
  },
});
