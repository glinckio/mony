import { LinearGradient } from "expo-linear-gradient";
import { useEffect, useMemo, useRef, useState } from "react";
import { AccessibilityInfo, Pressable, StyleSheet, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  cancelAnimation,
  Easing,
  FadeOutDown,
  runOnJS,
  SlideInDown,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useToastStore, type ToastTone } from "../../lib/toast-store";
import { layout, motionTokens, radius, space, useMotion, useTheme, type Theme } from "../../theme";

import { Icon, type IconName } from "./Icon";
import { Text } from "./Text";

const DURATION_MS = 4000;
const DURATION_WITH_ACTION_MS = 6000;

const TONES: Record<ToastTone, { icon: IconName; title: string }> = {
  success: { icon: "checkmark", title: "Pronto" },
  danger: { icon: "close", title: "Não deu certo" },
  warning: { icon: "alert", title: "Atenção" },
  neutral: { icon: "information", title: "Aviso" },
};

function toneGradient(tone: ToastTone, theme: Theme): readonly [string, string] {
  const { colors, gradients } = theme;
  if (tone === "success") return [colors.success, colors.success];
  if (tone === "danger") return [colors.danger, colors.danger];
  if (tone === "warning") return [colors.warning, colors.warning];
  return gradients.brand;
}

function toneColor(tone: ToastTone, colors: Theme["colors"]): string {
  if (tone === "success") return colors.success;
  if (tone === "danger") return colors.danger;
  if (tone === "warning") return colors.onWarningMuted;
  return colors.primary;
}

// App-wide toast (design/componentes.md → Mensagens): a white floating
// card above the tab bar — solid tone circle with a white glyph, the
// message, an optional amount or action — with a thin bar that runs out
// with its time. Slides up on a spring; drag down (or ×) to dismiss;
// pressing pauses it. Announced to screen readers without taking focus.
export function AppToast() {
  const { message, tone = "danger", action, receipt, key, hide } = useToastStore();
  const theme = useTheme();
  const { colors, elevation } = theme;
  const { reduced } = useMotion();
  const insets = useSafeAreaInsets();
  const [paused, setPaused] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const remaining = useSharedValue(1);
  const dragY = useSharedValue(0);
  const duration = action ? DURATION_WITH_ACTION_MS : DURATION_MS;

  useEffect(() => {
    if (!message) return;
    dragY.value = 0;
    AccessibilityInfo.announceForAccessibility(receipt ? `${message} ${receipt.amount}` : message);
  }, [message, receipt, key, dragY]);

  // Countdown: restarts from full after a press-and-release.
  useEffect(() => {
    if (!message) return;
    if (paused) {
      cancelAnimation(remaining);
      return;
    }
    remaining.value = 1;
    remaining.value = withTiming(0, { duration, easing: Easing.linear });
    timer.current = setTimeout(hide, duration);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [message, key, paused, duration, hide, remaining]);

  const dismiss = useMemo(
    () =>
      Gesture.Pan()
        .activeOffsetY(6)
        .onUpdate((event) => {
          dragY.value = Math.max(0, event.translationY);
        })
        .onEnd((event) => {
          if (event.translationY > 40 || event.velocityY > 600) {
            runOnJS(hide)();
          } else {
            dragY.value = withSpring(0, motionTokens.spring);
          }
        }),
    [dragY, hide],
  );

  const dragStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: dragY.value }],
    opacity: 1 - Math.min(0.6, dragY.value / 120),
  }));
  const countdown = useAnimatedStyle(() => ({ transform: [{ scaleX: remaining.value }] }));

  const spec = TONES[tone];
  const accent = toneColor(tone, colors);

  // The layer always stays mounted, so the card's `exiting` animation can
  // play when the message clears (it can't if its parent unmounts too).
  return (
    <View
      pointerEvents="box-none"
      style={[styles.layer, { bottom: insets.bottom + layout.tabBarHeight + space.lg }]}
    >
      {message ? (
        <Animated.View
          key={key}
          entering={reduced ? undefined : SlideInDown.springify().damping(18).stiffness(220)}
          exiting={reduced ? undefined : FadeOutDown.duration(160)}
          testID="toast"
          accessibilityLiveRegion="polite"
          style={styles.wrap}
        >
          <GestureDetector gesture={dismiss}>
            <Animated.View
              style={[styles.card, { backgroundColor: colors.surface }, elevation("lg"), dragStyle]}
            >
              <Pressable
                onPressIn={() => setPaused(true)}
                onPressOut={() => setPaused(false)}
                style={styles.row}
              >
                <View style={styles.iconWrap}>
                  <LinearGradient
                    colors={toneGradient(tone, theme)}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={[StyleSheet.absoluteFill, styles.iconFill]}
                  />
                  <Icon name={spec.icon} size="md" color={colors.onPrimary} />
                </View>

                <View style={styles.body}>
                  <Text variant="caption" color={accent} numberOfLines={1}>
                    {receipt ? (receipt.detail ?? spec.title) : spec.title}
                  </Text>
                  <Text variant="bodyStrong" numberOfLines={3}>
                    {message}
                  </Text>
                </View>

                {receipt ? (
                  <Text
                    variant="numeralLarge"
                    color={accent}
                    numberOfLines={1}
                    style={styles.amount}
                  >
                    {receipt.amount}
                  </Text>
                ) : null}

                {action ? (
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => {
                      action.onPress();
                      hide();
                    }}
                    hitSlop={8}
                    style={[styles.action, { backgroundColor: colors.primaryMuted }]}
                  >
                    <Text variant="subhead" tone="primary">
                      {action.label}
                    </Text>
                  </Pressable>
                ) : !receipt ? (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Fechar aviso"
                    onPress={hide}
                    hitSlop={12}
                    style={styles.close}
                  >
                    <Icon name="close" size="sm" color={colors.textSubtle} />
                  </Pressable>
                ) : null}
              </Pressable>
              <View style={[styles.track, { backgroundColor: colors.progressTrack }]}>
                <Animated.View style={[styles.countdown, { backgroundColor: accent }, countdown]} />
              </View>
            </Animated.View>
          </GestureDetector>
        </Animated.View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  layer: {
    position: "absolute",
    left: layout.screenPadding,
    right: layout.screenPadding,
    alignItems: "center",
    zIndex: 100,
  },
  wrap: {
    width: "100%",
    maxWidth: layout.maxContentWidth,
  },
  card: {
    borderRadius: radius.lg,
    overflow: "hidden",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
    paddingVertical: space.md + 2,
    paddingLeft: space.md + 2,
    paddingRight: space.lg,
  },
  iconWrap: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  iconFill: {
    borderRadius: radius.full,
  },
  body: {
    flex: 1,
    gap: 1,
  },
  amount: {
    marginLeft: space.xs,
  },
  action: {
    paddingHorizontal: space.md,
    paddingVertical: space.xs + 2,
    borderRadius: radius.full,
  },
  close: {
    width: 24,
    height: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  track: {
    height: 3,
  },
  countdown: {
    height: 3,
    transformOrigin: "left",
  },
});
