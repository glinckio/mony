import { LinearGradient } from "expo-linear-gradient";
import { useEffect, useRef } from "react";
import { StyleSheet } from "react-native";
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from "react-native-reanimated";

import { motionTokens, useMotion } from "../../theme";

const [x1, y1, x2, y2] = motionTokens.easing.decelerate;
const DECELERATE = Easing.bezier(x1, y1, x2, y2);

interface ChartBarProps {
  value: number;
  max: number;
  // Full height of the plot (the bar's height at `max`).
  height: number;
  gradient: readonly [string, string];
  // Stagger when several bars enter together.
  index: number;
  width?: number;
}

// One rounded gradient bar of the app's column charts (Início's year,
// Relatórios): it has its final height and grows by scaleY from the
// bottom — a transform, so many bars don't re-layout on every frame. New
// data starts from where the old bar ended.
export function ChartBar({ value, max, height, gradient, index, width = 7 }: ChartBarProps) {
  const { reduced } = useMotion();
  // A small non-zero value still shows, as a dot (as tall as the bar is wide).
  const target = Math.max(value > 0 ? width : 0, max > 0 ? (value / max) * height : 0);
  const scale = useSharedValue(reduced ? 1 : 0);
  const previous = useRef(0);

  useEffect(() => {
    // Where the bar is right now (mid-animation included), not where the
    // last animation was heading: new data mid-growth doesn't jump.
    cancelAnimation(scale);
    const from = scale.value * previous.current;
    previous.current = target;
    if (reduced || target === 0) {
      scale.value = 1;
      return;
    }
    scale.value = from / target;
    scale.value = withDelay(
      from === 0 ? index * 25 : 0,
      withTiming(1, { duration: 460, easing: DECELERATE }),
    );
  }, [target, index, reduced, scale]);

  const style = useAnimatedStyle(() => ({ transform: [{ scaleY: scale.value }] }));
  return (
    <Animated.View style={[styles.bar, { height: target, width, borderRadius: width / 2 }, style]}>
      <LinearGradient
        colors={gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  bar: {
    overflow: "hidden",
    transformOrigin: "bottom",
  },
});
