import { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";

import { useMotion, useTheme } from "../../theme";

interface MarkLoaderProps {
  color?: string;
  size?: "sm" | "md";
  accessibilityLabel?: string;
}

// The app's own spinner: three ruler ticks rising in turn, like marks
// being tallied in the margin. Reduced motion keeps them still.
export function MarkLoader({
  color,
  size = "sm",
  accessibilityLabel = "Carregando",
}: MarkLoaderProps) {
  const { colors } = useTheme();
  const height = size === "sm" ? 14 : 20;
  return (
    <View
      style={styles.row}
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={accessibilityLabel}
    >
      {[0, 1, 2].map((index) => (
        <Tick key={index} index={index} height={height} color={color ?? colors.text} />
      ))}
    </View>
  );
}

function Tick({ index, height, color }: { index: number; height: number; color: string }) {
  const { reduced } = useMotion();
  const progress = useSharedValue(reduced ? 1 : 0.35);

  useEffect(() => {
    if (reduced) {
      progress.value = 1;
      return;
    }
    progress.value = withDelay(
      index * 140,
      withRepeat(
        withSequence(withTiming(1, { duration: 280 }), withTiming(0.35, { duration: 280 })),
        -1,
      ),
    );
    return () => cancelAnimation(progress);
  }, [index, progress, reduced]);

  const style = useAnimatedStyle(() => ({
    transform: [{ scaleY: progress.value }],
    opacity: progress.value,
  }));

  return <Animated.View style={[styles.tick, { height, backgroundColor: color }, style]} />;
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 4,
  },
  tick: {
    width: 2,
    borderRadius: 1,
    transformOrigin: "bottom",
  },
});
