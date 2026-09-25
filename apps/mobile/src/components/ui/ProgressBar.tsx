import { color, radius, spacing } from "@mony/ui-tokens";
import { StyleSheet, View } from "react-native";

export type ProgressTone = "primary" | "success" | "warning" | "danger";

const FILL_COLORS: Record<ProgressTone, string> = {
  primary: color.primary,
  success: color.success,
  warning: color.warning,
  danger: color.danger,
};

interface ProgressBarProps {
  percent: number;
  tone?: ProgressTone;
  testID?: string;
}

export function ProgressBar({ percent, tone = "primary", testID }: ProgressBarProps) {
  const clamped = Math.min(100, Math.max(0, percent));

  return (
    <View
      style={styles.track}
      testID={testID}
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: Math.round(clamped) }}
    >
      <View style={[styles.fill, { width: `${clamped}%`, backgroundColor: FILL_COLORS[tone] }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    height: spacing.sm,
    borderRadius: radius.sm,
    backgroundColor: color.surfaceAlt,
    overflow: "hidden",
  },
  fill: {
    height: "100%",
    borderRadius: radius.sm,
  },
});
