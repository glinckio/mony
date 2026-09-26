import { LinearGradient } from "expo-linear-gradient";
import { useEffect, useState } from "react";
import {
  StyleSheet,
  View,
  type DimensionValue,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";

import { radius as radii, useMotion, useTheme } from "../../theme";

interface SkeletonProps {
  width?: DimensionValue;
  height?: number;
  radius?: keyof typeof radii;
  style?: StyleProp<ViewStyle>;
}

// A placeholder block in `surfaceMuted` with a slow diagonal sheen.
// Screens compose these into the silhouette of their domain components.
export function Skeleton({ width = "100%", height = 14, radius = "xs", style }: SkeletonProps) {
  const { colors } = useTheme();
  const { reduced } = useMotion();
  const [blockWidth, setBlockWidth] = useState(0);
  const sweep = useSharedValue(0);

  useEffect(() => {
    if (reduced || blockWidth === 0) return;
    sweep.value = 0;
    sweep.value = withRepeat(withTiming(1, { duration: 1400 }), -1);
    return () => cancelAnimation(sweep);
  }, [blockWidth, reduced, sweep]);

  const sheen = useAnimatedStyle(() => ({
    transform: [{ translateX: -blockWidth + sweep.value * blockWidth * 2 }],
  }));

  return (
    <View
      onLayout={(event) => setBlockWidth(event.nativeEvent.layout.width)}
      style={[
        styles.block,
        { width, height, borderRadius: radii[radius], backgroundColor: colors.surfaceMuted },
        style,
      ]}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      {!reduced && blockWidth > 0 && (
        <Animated.View style={[StyleSheet.absoluteFill, sheen]}>
          <LinearGradient
            colors={["transparent", `${colors.surface}73`, "transparent"]}
            start={{ x: 0, y: 0.3 }}
            end={{ x: 1, y: 0.7 }}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  block: {
    overflow: "hidden",
  },
});
