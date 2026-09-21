import { color, radius, spacing } from "@mony/ui-tokens";
import { StyleSheet, View } from "react-native";

interface ProgressBarProps {
  percent: number;
  testID?: string;
}

export function ProgressBar({ percent, testID }: ProgressBarProps) {
  const clamped = Math.min(100, Math.max(0, percent));

  return (
    <View style={styles.track} testID={testID}>
      <View style={[styles.fill, { width: `${clamped}%` }]} />
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
    backgroundColor: color.primary,
  },
});
