import { color, radius, spacing } from "@mony/ui-tokens";
import { useEffect } from "react";
import { StyleSheet, View } from "react-native";

import { useToastStore } from "../../lib/toast-store";

import { Text } from "./Text";

const AUTO_DISMISS_MS = 3000;

// Mounted once at the app root (see App.tsx) — screens trigger it via
// `useToastStore.getState().show(message)`, not by rendering their own.
export function Toast() {
  const message = useToastStore((state) => state.message);
  const hide = useToastStore((state) => state.hide);

  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(hide, AUTO_DISMISS_MS);
    return () => clearTimeout(timer);
  }, [message, hide]);

  if (!message) return null;

  return (
    <View style={styles.container} pointerEvents="none" testID="toast">
      <View style={styles.toast}>
        <Text variant="caption" color={color.onPrimary}>
          {message}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    bottom: spacing.xxl,
    left: 0,
    right: 0,
    alignItems: "center",
  },
  toast: {
    maxWidth: "85%",
    backgroundColor: color.textPrimary,
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
});
