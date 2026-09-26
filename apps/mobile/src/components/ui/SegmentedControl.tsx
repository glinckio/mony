import { LinearGradient } from "expo-linear-gradient";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  StyleSheet,
  View,
  type LayoutChangeEvent,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

import { motionTokens, radius, space, useMotion, useTheme } from "../../theme";

import { Text } from "./Text";
import { Touchable } from "./Touchable";

const [x1, y1, x2, y2] = motionTokens.easing.decelerate;
const DECELERATE = Easing.bezier(x1, y1, x2, y2);

export interface SegmentOption<T extends string> {
  value: T;
  label: string;
}

interface SegmentedControlProps<T extends string> {
  options: Array<SegmentOption<T>>;
  value: T;
  onChange: (value: T) => void;
  disabled?: boolean;
  size?: "md" | "sm";
  // "glass": translucent track with a white pill, for use on the gradient hero.
  variant?: "default" | "glass";
  accessibilityLabel?: string;
  // Per-option testID (defaults to `${testID}-${value}`).
  optionTestID?: (value: T) => string;
  // Per-option accessible label when the visible one is abbreviated.
  optionAccessibilityLabel?: (option: SegmentOption<T>) => string;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

interface Box {
  x: number;
  width: number;
}

// White pill track with the brand-gradient pill gliding to the chosen
// option (white label on it, muted labels elsewhere).
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  disabled = false,
  size = "md",
  variant = "default",
  accessibilityLabel,
  optionTestID,
  optionAccessibilityLabel,
  style,
  testID,
}: SegmentedControlProps<T>) {
  const { colors, gradients, elevation } = useTheme();
  const { reduced } = useMotion();
  const [boxes, setBoxes] = useState<Partial<Record<T, Box>>>({});
  const x = useSharedValue(0);
  const width = useSharedValue(0);
  const visible = useSharedValue(0);
  const placed = useRef(false);

  const measure = useCallback((key: T, event: LayoutChangeEvent) => {
    const { x: left, width: w } = event.nativeEvent.layout;
    setBoxes((current) => {
      const known = current[key];
      if (known && known.x === left && known.width === w) return current;
      return { ...current, [key]: { x: left, width: w } };
    });
  }, []);

  const box = boxes[value];
  useEffect(() => {
    if (!box) {
      visible.value = 0;
      return;
    }
    if (!placed.current || reduced) {
      x.value = box.x;
      width.value = box.width;
      placed.current = true;
    } else {
      const config = { duration: motionTokens.duration.base, easing: DECELERATE };
      x.value = withTiming(box.x, config);
      // Equal-width segments (the usual case) only slide: animating width
      // would re-layout the pill on every frame for nothing.
      if (Math.abs(width.value - box.width) > 0.5) width.value = withTiming(box.width, config);
      else width.value = box.width;
    }
    visible.value = withTiming(1, { duration: motionTokens.duration.fast });
  }, [box, reduced, x, width, visible]);

  const pill = useAnimatedStyle(() => ({
    opacity: visible.value,
    transform: [{ translateX: x.value }],
    width: width.value,
  }));

  const small = size === "sm";
  const glass = variant === "glass";
  return (
    <View
      testID={testID}
      accessibilityRole="tablist"
      accessibilityLabel={accessibilityLabel}
      style={[
        styles.track,
        small ? styles.trackSmall : null,
        glass
          ? { backgroundColor: colors.glassFill, borderColor: colors.glassBorder, borderWidth: 1 }
          : [{ backgroundColor: colors.surface }, elevation("sm")],
        style,
      ]}
    >
      <Animated.View
        style={[styles.pill, small ? styles.pillSmall : null, pill]}
        pointerEvents="none"
      >
        {glass ? (
          <View
            style={[
              StyleSheet.absoluteFill,
              { borderRadius: radius.full, backgroundColor: colors.surface },
            ]}
          />
        ) : (
          <LinearGradient
            colors={gradients.brand}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[StyleSheet.absoluteFill, { borderRadius: radius.full }]}
          />
        )}
      </Animated.View>
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Touchable
            key={option.value}
            testID={
              optionTestID
                ? optionTestID(option.value)
                : testID
                  ? `${testID}-${option.value}`
                  : undefined
            }
            feedback="fade"
            haptic="selection"
            accessibilityRole="tab"
            accessibilityLabel={
              optionAccessibilityLabel ? optionAccessibilityLabel(option) : option.label
            }
            accessibilityState={{ selected, disabled }}
            disabled={disabled}
            onPress={() => {
              if (!selected) onChange(option.value);
            }}
            onLayout={(event) => measure(option.value, event)}
            style={[styles.option, small ? styles.optionSmall : null, disabled && styles.disabled]}
          >
            <Text
              variant={small ? "caption" : "subhead"}
              color={
                glass
                  ? selected
                    ? colors.primary
                    : colors.onGlassMuted
                  : selected
                    ? colors.onPrimary
                    : colors.textMuted
              }
              numberOfLines={1}
            >
              {option.label}
            </Text>
          </Touchable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    flexDirection: "row",
    borderRadius: radius.full,
    padding: space.xs,
  },
  trackSmall: {
    alignSelf: "flex-start",
    padding: 3,
  },
  pill: {
    position: "absolute",
    top: space.xs,
    bottom: space.xs,
    left: 0,
    borderRadius: radius.full,
    overflow: "hidden",
  },
  pillSmall: {
    top: 3,
    bottom: 3,
  },
  option: {
    flex: 1,
    minHeight: 40,
    paddingHorizontal: space.md,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.full,
  },
  optionSmall: {
    flex: 0,
    minHeight: 30,
    paddingHorizontal: space.md,
  },
  disabled: {
    opacity: 0.5,
  },
});
