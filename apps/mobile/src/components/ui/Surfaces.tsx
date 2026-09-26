import type { GradientName } from "@mony/ui-tokens";
import { LinearGradient } from "expo-linear-gradient";
import { useEffect, useState, type ReactNode } from "react";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from "react-native-reanimated";

import { motionTokens, radius, space, useMotion, useTheme } from "../../theme";

import { Icon, type IconName } from "./Icon";

const [x1, y1, x2, y2] = motionTokens.easing.decelerate;
const DECELERATE = Easing.bezier(x1, y1, x2, y2);

// White floating card with the soft indigo shadow — the basic surface of
// the "Índigo Suave" direction (design/style-guide.md).
export function Card({
  children,
  style,
  padded = true,
  testID,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  padded?: boolean;
  testID?: string;
}) {
  const { colors, elevation } = useTheme();
  return (
    <View
      testID={testID}
      style={[
        styles.card,
        padded && styles.cardPadded,
        { backgroundColor: colors.surface },
        elevation("md"),
        style,
      ]}
    >
      {children}
    </View>
  );
}

// Diagonal gradient fill from the theme (brand, balance, progress…).
export function Gradient({
  name = "brand",
  colors: override,
  style,
  children,
}: {
  name?: GradientName;
  colors?: readonly [string, string];
  style?: StyleProp<ViewStyle>;
  children?: ReactNode;
}) {
  const { gradients } = useTheme();
  return (
    <LinearGradient
      colors={override ?? gradients[name]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={style}
    >
      {children}
    </LinearGradient>
  );
}

// Pastel circle holding a colored glyph (categories, list entries, empty
// states). `color` is the glyph color; the fill is the same hue at 14%.
export function IconBadge({
  icon,
  color,
  size = 44,
  filled = false,
}: {
  icon: IconName;
  color?: string;
  size?: number;
  filled?: boolean;
}) {
  const { colors } = useTheme();
  const tint = color ?? colors.primary;
  return (
    <View
      style={[styles.badge, { width: size, height: size, backgroundColor: withAlpha(tint, 0.14) }]}
    >
      <Icon
        name={icon}
        size={size >= 56 ? "xl" : size >= 40 ? "md" : "sm"}
        color={tint}
        filled={filled}
      />
    </View>
  );
}

// "#RRGGBB" + alpha → "#RRGGBBAA" (data colors like a category's).
export function withAlpha(hex: string, alpha: number): string {
  if (!/^#[0-9A-Fa-f]{6}$/.test(hex)) return hex;
  const channel = Math.round(Math.max(0, Math.min(1, alpha)) * 255)
    .toString(16)
    .padStart(2, "0");
  return `${hex}${channel}`;
}

interface ProgressBarProps {
  percent: number;
  // Solid tone instead of the brand gradient (budget thresholds); "glass"
  // sits on a gradient hero (translucent track, white fill).
  tone?: "brand" | "success" | "warning" | "danger" | "glass";
  height?: number;
  index?: number;
  accessibilityLabel?: string;
  testID?: string;
}

// Rounded track with a gradient fill that grows from the left the first
// time it shows (stagger by `index` when several enter together).
export function ProgressBar({
  percent,
  tone = "brand",
  height = 8,
  index = 0,
  accessibilityLabel,
  testID,
}: ProgressBarProps) {
  const { colors, gradients } = useTheme();
  const { reduced } = useMotion();
  const clamped = Math.max(0, Math.min(100, percent));
  const [width, setWidth] = useState(0);
  const fill = useSharedValue(reduced ? clamped : 0);

  useEffect(() => {
    if (width === 0) return;
    fill.value = reduced
      ? clamped
      : withDelay(
          index * motionTokens.stagger,
          withTiming(clamped, { duration: 480, easing: DECELERATE }),
        );
  }, [clamped, width, index, reduced, fill]);

  // Full-width fill slid in from the left (transform, no layout pass per
  // frame); the track's overflow clips what's outside.
  const fillStyle = useAnimatedStyle(() => ({
    // Hidden until the track is measured, or it would flash full.
    opacity: width === 0 ? 0 : 1,
    transform: [{ translateX: -((100 - fill.value) / 100) * width }],
  }));
  const solid =
    tone === "success"
      ? colors.success
      : tone === "warning"
        ? colors.warning
        : tone === "danger"
          ? colors.danger
          : tone === "glass"
            ? colors.onGlass
            : null;
  const trackColor = tone === "glass" ? colors.glassFill : colors.progressTrack;

  return (
    <View
      testID={testID}
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={accessibilityLabel}
      accessibilityValue={{ min: 0, max: 100, now: Math.round(clamped) }}
      onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
      style={[styles.track, { height, borderRadius: height / 2, backgroundColor: trackColor }]}
    >
      <Animated.View
        style={[
          styles.fill,
          { borderRadius: height / 2 },
          solid ? { backgroundColor: solid } : null,
          fillStyle,
        ]}
      >
        {solid ? null : (
          <LinearGradient
            colors={gradients.progress}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={StyleSheet.absoluteFill}
          />
        )}
      </Animated.View>
    </View>
  );
}

// The page behind every screen: lavender that deepens a little at the top.
export function ScreenBackground() {
  const { gradients } = useTheme();
  return (
    <LinearGradient
      pointerEvents="none"
      colors={gradients.screen}
      locations={[0, 0.5]}
      style={StyleSheet.absoluteFill}
    />
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.lg,
  },
  cardPadded: {
    padding: space.lg,
  },
  badge: {
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  track: {
    overflow: "hidden",
    width: "100%",
  },
  fill: {
    width: "100%",
    height: "100%",
    overflow: "hidden",
  },
});
