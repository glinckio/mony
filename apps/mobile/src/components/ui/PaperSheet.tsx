import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  Dimensions,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  View,
} from "react-native";
import { Gesture, GestureDetector, GestureHandlerRootView } from "react-native-gesture-handler";
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { layout, motionTokens, radius, space, useMotion, useTheme } from "../../theme";

import { IconButton } from "./IconButton";
import { Text } from "./Text";

const OFFSCREEN = Dimensions.get("window").height;
const CLOSE_MS = 180;

interface PaperSheetProps {
  visible: boolean;
  onClose: () => void;
  // Called once the exit animation is over and the Modal is gone. Open a
  // follow-up sheet from here: iOS refuses to present a second Modal while
  // the first one is still on screen.
  onDismissed?: () => void;
  // false while an action runs: dragging down springs the sheet back
  // instead of asking to close.
  dismissible?: boolean;
  title?: string;
  children: ReactNode;
  testID?: string;
}

// A sheet of paper sliding up from the bottom (design/componentes.md →
// Família): ink handle, spring in, faster fade out; closes by dragging it
// down, tapping the backdrop, the close button or Android back. Lives in
// its own Modal window, so it carries its own keyboard avoidance.
export function PaperSheet({
  visible,
  onClose,
  onDismissed,
  dismissible = true,
  title,
  children,
  testID,
}: PaperSheetProps) {
  const { colors, elevation } = useTheme();
  const { reduced } = useMotion();
  const insets = useSafeAreaInsets();
  const [mounted, setMounted] = useState(visible);
  const offset = useSharedValue(OFFSCREEN);
  const shade = useSharedValue(0);
  const onDismissedRef = useRef(onDismissed);
  onDismissedRef.current = onDismissed;

  // Content is usually derived from state the parent clears on close
  // (`title={item ? … : ""}`); keep showing the last open content while
  // the sheet slides away instead of an emptied sheet.
  const shown = useRef({ title, children });
  if (visible) shown.current = { title, children };

  useEffect(() => {
    if (visible) {
      setMounted(true);
      shade.value = withTiming(1, { duration: motionTokens.duration.base });
      offset.value = reduced
        ? withTiming(0, { duration: motionTokens.duration.fast })
        : withSpring(0, motionTokens.spring);
      return;
    }
    if (!mounted) return;
    shade.value = withTiming(0, { duration: CLOSE_MS });
    offset.value = withTiming(OFFSCREEN * 0.6, { duration: CLOSE_MS });
    const timer = setTimeout(() => {
      setMounted(false);
      onDismissedRef.current?.();
    }, CLOSE_MS);
    return () => clearTimeout(timer);
    // `mounted` only gates the close branch, so it stays out of the deps.
  }, [visible, reduced, offset, shade]);

  const drag = useMemo(
    () =>
      Gesture.Pan()
        .activeOffsetY(8)
        .onUpdate((event) => {
          offset.value = Math.max(0, event.translationY);
        })
        .onEnd((event) => {
          if (dismissible && (event.translationY > 120 || event.velocityY > 900)) {
            runOnJS(onClose)();
          } else {
            offset.value = withSpring(0, motionTokens.spring);
          }
        }),
    [dismissible, onClose, offset],
  );

  const sheetStyle = useAnimatedStyle(() => ({ transform: [{ translateY: offset.value }] }));
  const shadeStyle = useAnimatedStyle(() => ({ opacity: shade.value }));

  return (
    <Modal
      visible={mounted}
      transparent
      animationType="none"
      onRequestClose={dismissible ? onClose : () => undefined}
    >
      <GestureHandlerRootView style={styles.flex}>
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <Animated.View
            style={[StyleSheet.absoluteFill, { backgroundColor: colors.overlay }, shadeStyle]}
          >
            <Pressable
              style={styles.flex}
              onPress={dismissible ? onClose : undefined}
              accessibilityRole="button"
              accessibilityLabel="Fechar"
              testID={testID ? `${testID}-backdrop` : undefined}
            />
          </Animated.View>
          <View style={styles.flex} pointerEvents="box-none" />
          <GestureDetector gesture={drag}>
            <Animated.View
              testID={testID}
              accessibilityViewIsModal
              style={[
                styles.sheet,
                {
                  backgroundColor: colors.surfaceElevated,
                  paddingBottom: insets.bottom + space.xl,
                },
                elevation("lg"),
                sheetStyle,
              ]}
            >
              <View style={styles.handleArea}>
                <View style={[styles.handle, { backgroundColor: colors.borderStrong }]} />
              </View>
              <View style={styles.content}>
                {shown.current.title ? (
                  <View style={styles.header}>
                    <Text variant="title2" accessibilityRole="header" style={styles.title}>
                      {shown.current.title}
                    </Text>
                    <IconButton
                      testID={testID ? `${testID}-close` : undefined}
                      icon="close"
                      accessibilityLabel="Fechar"
                      variant="soft"
                      disabled={!dismissible}
                      onPress={onClose}
                    />
                  </View>
                ) : null}
                {shown.current.children}
              </View>
            </Animated.View>
          </GestureDetector>
        </KeyboardAvoidingView>
      </GestureHandlerRootView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  sheet: {
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
  },
  handleArea: {
    alignItems: "center",
    paddingTop: space.md,
    paddingBottom: space.sm,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: radius.full,
  },
  content: {
    width: "100%",
    maxWidth: layout.maxContentWidth,
    alignSelf: "center",
    paddingHorizontal: layout.screenPadding,
    gap: space.lg,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
  },
  title: {
    flex: 1,
  },
});
