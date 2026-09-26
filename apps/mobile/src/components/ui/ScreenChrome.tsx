import { BottomTabBarHeightContext } from "@react-navigation/bottom-tabs";
import { useContext, useMemo, useState, type ReactNode } from "react";
import {
  StyleSheet,
  View,
  type LayoutChangeEvent,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import Animated, {
  interpolate,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  type SharedValue,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { layout, space, useMotion, useTheme } from "../../theme";

import { IconButton } from "./IconButton";
import { Text } from "./Text";

// Screen chrome for the "Índigo Suave" direction (design/componentes.md →
// Chrome): a floating top bar — white circle buttons on the sides and the
// title centered — whose white background fades in once content scrolls
// under it. Insets are applied per piece, never by wrapping the screen.

export const TOP_BAR_HEIGHT = layout.headerCompactHeight;

export function useScrollHeader() {
  const scrollY = useSharedValue(0);
  const [threshold, setThreshold] = useState(8);
  const onScroll = useAnimatedScrollHandler((event) => {
    scrollY.value = event.contentOffset.y;
  });
  // For screens with a large header: the bar title appears as it leaves.
  const onTitleLayout = (event: LayoutChangeEvent) => {
    const { y, height } = event.nativeEvent.layout;
    setThreshold(Math.max(8, y + height - TOP_BAR_HEIGHT));
  };
  return { scrollY, threshold, onScroll, onTitleLayout };
}

// Bottom padding a scrolling screen needs so its last row clears the
// floating tab bar (the home indicator on stacked screens).
export function useBottomClearance(extra: number = space["2xl"]): number {
  const insets = useSafeAreaInsets();
  const tabBarHeight = useContext(BottomTabBarHeightContext) ?? 0;
  return (tabBarHeight > 0 ? tabBarHeight : insets.bottom) + extra;
}

interface TopBarProps {
  scrollY: SharedValue<number>;
  threshold: number;
  title?: string;
  // "always": the centered title is always shown (most screens);
  // "onScroll": it fades in once the large header scrolls away.
  titleVisibility?: "always" | "onScroll";
  onBack?: () => void;
  // Left slot when there's no back button (e.g. an avatar).
  leading?: ReactNode;
  actions?: ReactNode;
  // "overlay": over a photo hero — translucent round buttons.
  variant?: "default" | "overlay";
}

export function TopBar({
  scrollY,
  threshold,
  title,
  titleVisibility = "always",
  onBack,
  leading,
  actions,
  variant = "default",
}: TopBarProps) {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { reduced } = useMotion();

  const backdrop = useAnimatedStyle(() => {
    const progress = interpolate(scrollY.value, [threshold, threshold + 24], [0, 1], "clamp");
    return { opacity: reduced ? (progress > 0.5 ? 1 : 0) : progress };
  });
  const titleStyle = useAnimatedStyle(() => {
    if (titleVisibility === "always") return { opacity: 1 };
    const progress = interpolate(scrollY.value, [threshold, threshold + 24], [0, 1], "clamp");
    return { opacity: reduced ? (progress > 0.5 ? 1 : 0) : progress };
  });

  return (
    <View style={[styles.bar, { paddingTop: insets.top }]} pointerEvents="box-none">
      <Animated.View
        pointerEvents="none"
        style={[
          StyleSheet.absoluteFill,
          styles.backdrop,
          { backgroundColor: colors.chrome, borderBottomColor: colors.border },
          backdrop,
        ]}
      />
      <View style={styles.row} pointerEvents="box-none">
        <View style={styles.side}>
          {onBack ? (
            <IconButton
              testID="header-back"
              icon="chevron-back"
              accessibilityLabel="Voltar"
              variant={variant === "overlay" ? "overlay" : "soft"}
              onPress={onBack}
            />
          ) : (
            leading
          )}
        </View>
        <Animated.View style={[styles.title, titleStyle]} pointerEvents="none">
          {title ? (
            <Text variant="title3" align="center" numberOfLines={1} accessibilityRole="header">
              {title}
            </Text>
          ) : null}
        </Animated.View>
        <View style={[styles.side, styles.sideEnd]}>{actions}</View>
      </View>
    </View>
  );
}

interface GreetingHeaderProps {
  // Small muted line on top ("Bom dia,").
  eyebrow?: string;
  title: string;
  accessory?: ReactNode;
  onLayout?: (event: LayoutChangeEvent) => void;
  style?: StyleProp<ViewStyle>;
}

// Large header living in the content (Início): muted greeting over the
// name in bold.
export function LargeTitle({ eyebrow, title, accessory, onLayout, style }: GreetingHeaderProps) {
  return (
    <View style={[styles.largeTitle, style]} onLayout={onLayout}>
      {eyebrow ? (
        <Text variant="callout" tone="muted" numberOfLines={1}>
          {eyebrow}
        </Text>
      ) : null}
      <Text variant="title1" accessibilityRole="header" numberOfLines={2}>
        {title}
      </Text>
      {accessory}
    </View>
  );
}

// Content padding every screen shares, so all screens start at the same
// height and the same left edge.
export function useScreenInsets() {
  const { top } = useSafeAreaInsets();
  // Memoized: lists memoize their contentContainerStyle on this object.
  return useMemo(
    () => ({
      paddingTop: top + TOP_BAR_HEIGHT + space.sm,
      paddingHorizontal: layout.screenPadding,
    }),
    [top],
  );
}

const styles = StyleSheet.create({
  bar: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  backdrop: {
    borderBottomWidth: StyleSheet.hairlineWidth * 2,
  },
  row: {
    height: TOP_BAR_HEIGHT,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: layout.screenPadding,
    gap: space.sm,
  },
  // Equal side slots keep the title optically centered.
  side: {
    flex: 1,
    minWidth: 44,
    flexDirection: "row",
    alignItems: "center",
    gap: space.sm,
  },
  sideEnd: {
    justifyContent: "flex-end",
  },
  title: {
    flex: 2.6,
  },
  largeTitle: {
    gap: space.xxs,
    paddingBottom: space.xl,
  },
});
