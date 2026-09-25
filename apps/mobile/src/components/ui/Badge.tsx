import { color, radius, spacing } from "@mony/ui-tokens";
import { StyleSheet, View } from "react-native";

import { Text } from "./Text";

export type BadgeTone = "success" | "danger" | "warning" | "info" | "neutral";

const TONES: Record<BadgeTone, { background: string; foreground: string }> = {
  success: { background: color.successMuted, foreground: color.success },
  danger: { background: color.dangerMuted, foreground: color.danger },
  warning: { background: color.warningMuted, foreground: color.warning },
  info: { background: color.infoMuted, foreground: color.info },
  neutral: { background: color.surfaceAlt, foreground: color.textSecondary },
};

interface BadgeProps {
  label: string;
  tone?: BadgeTone;
  testID?: string;
}

// Small status pill (e.g. "Atrasada", "Paga") — tone picks the semantic
// muted background + matching foreground pair from ui-tokens.
export function Badge({ label, tone = "neutral", testID }: BadgeProps) {
  const { background, foreground } = TONES[tone];

  return (
    <View style={[styles.badge, { backgroundColor: background }]} testID={testID}>
      <Text variant="caption" color={foreground}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: "flex-start",
    borderRadius: radius.sm,
    paddingVertical: spacing.xxs,
    paddingHorizontal: spacing.sm,
  },
});
