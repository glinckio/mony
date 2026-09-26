import { forwardRef, type ReactNode } from "react";
import {
  Pressable,
  StyleSheet,
  View,
  type GestureResponderEvent,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  type SharedValue,
} from "react-native-reanimated";

import { motionTokens, useTheme } from "../../theme";
import { haptic as haptics } from "../../theme/haptics";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

// Press feedback per kind of piece (design/style-guide.md → Movimento),
// not one generic scale for everything:
// - sink: ink buttons press in (scale + slight darken)
// - row: ledger lines get a `surfaceMuted` wash behind their content
// - fade: small inline controls dim
// - none: the piece animates itself (stamps, chips)
export type TouchFeedback = "sink" | "row" | "fade" | "none";

export interface TouchableProps extends Omit<PressableProps, "style" | "children"> {
  feedback?: TouchFeedback;
  haptic?: keyof typeof haptics;
  style?: StyleProp<ViewStyle>;
  children?: ReactNode;
}

export const Touchable = forwardRef<View, TouchableProps>(function Touchable(
  { feedback = "row", haptic, style, children, onPressIn, onPressOut, onPress, disabled, ...rest },
  ref,
) {
  const pressed = useSharedValue(0);
  const animates = feedback !== "none";

  const handlePressIn = (event: GestureResponderEvent) => {
    if (animates) pressed.value = withTiming(1, { duration: motionTokens.duration.fast });
    onPressIn?.(event);
  };
  const handlePressOut = (event: GestureResponderEvent) => {
    if (animates) pressed.value = withTiming(0, { duration: motionTokens.duration.base });
    onPressOut?.(event);
  };
  const handlePress = (event: GestureResponderEvent) => {
    if (haptic) haptics[haptic]();
    onPress?.(event);
  };

  const pressableProps = {
    ...rest,
    disabled,
    onPressIn: handlePressIn,
    onPressOut: handlePressOut,
    onPress: onPress ? handlePress : undefined,
  };

  // Each kind only sets up the animated style it uses — lists render many
  // Touchables, and every useAnimatedStyle is a UI-thread mapper.
  if (feedback === "sink" || feedback === "fade") {
    return (
      <PressFeedback
        ref={ref}
        {...pressableProps}
        feedback={feedback}
        pressed={pressed}
        style={style}
      >
        {children}
      </PressFeedback>
    );
  }
  return (
    <AnimatedPressable ref={ref} {...pressableProps} style={style}>
      {feedback === "row" ? <RowWash pressed={pressed} /> : null}
      {children}
    </AnimatedPressable>
  );
});

type PressFeedbackProps = Omit<TouchableProps, "feedback" | "haptic"> & {
  feedback: "sink" | "fade";
  pressed: SharedValue<number>;
};

const PressFeedback = forwardRef<View, PressFeedbackProps>(function PressFeedback(
  { feedback, pressed, style, children, ...rest },
  ref,
) {
  const containerStyle = useAnimatedStyle(() =>
    feedback === "sink"
      ? { transform: [{ scale: 1 - pressed.value * 0.03 }], opacity: 1 - pressed.value * 0.1 }
      : { opacity: 1 - pressed.value * 0.45 },
  );
  return (
    <AnimatedPressable ref={ref} {...rest} style={[style, containerStyle]}>
      {children}
    </AnimatedPressable>
  );
});

function RowWash({ pressed }: { pressed: SharedValue<number> }) {
  const { colors } = useTheme();
  const washStyle = useAnimatedStyle(() => ({ opacity: pressed.value }));
  return (
    <Animated.View
      pointerEvents="none"
      style={[StyleSheet.absoluteFill, { backgroundColor: colors.surfaceMuted }, washStyle]}
    />
  );
}
