import { StatusBar } from "expo-status-bar";
import { useState, type ReactNode } from "react";
import {
  RefreshControl,
  StyleSheet,
  View,
  type LayoutChangeEvent,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { KeyboardAwareScrollView, KeyboardStickyView } from "react-native-keyboard-controller";
import Animated, { runOnJS, useAnimatedReaction, type SharedValue } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useScreenFocused } from "../../lib/use-screen-focused";
import { layout, radius, space, useTheme } from "../../theme";

import { IconButton } from "./IconButton";
import {
  LargeTitle,
  TOP_BAR_HEIGHT,
  TopBar,
  useBottomClearance,
  useScreenInsets,
  useScrollHeader,
} from "./ScreenChrome";
import { ScreenBackground } from "./Surfaces";
import { Text } from "./Text";

interface ScrollScreenProps {
  // Centered in the top bar.
  title: string;
  // Large greeting header in the content (Início); the bar title then
  // only appears once it scrolls away.
  largeTitle?: { eyebrow?: string; title: string; accessory?: ReactNode };
  // Full-bleed banner at the very top (behind the status bar), before the
  // padded content; the status bar is light over it. Content that follows
  // overlaps its bottom edge by `heroOverlap`.
  hero?: ReactNode;
  heroOverlap?: number;
  onBack?: () => void;
  leading?: ReactNode;
  actions?: ReactNode;
  // Behind the top of the content (e.g. the soft glow); a function
  // receives the scroll offset (parallax).
  background?: ReactNode | ((scrollY: SharedValue<number>) => ReactNode);
  refreshing?: boolean;
  onRefresh?: () => void;
  // Form-like content inside (period dates): keyboard-aware scrolling.
  // Fixed per screen — switching it swaps the scroll view (remount).
  keyboardAware?: boolean;
  children: ReactNode;
  contentStyle?: StyleProp<ViewStyle>;
  testID?: string;
}

// Scrolling screen with the app's chrome: lavender page, floating top bar
// with the centered title, bottom padding that clears the tab bar.
export function ScrollScreen({
  title,
  largeTitle,
  hero,
  heroOverlap = 0,
  onBack,
  leading,
  actions,
  background,
  refreshing,
  onRefresh,
  keyboardAware = false,
  children,
  contentStyle,
  testID,
}: ScrollScreenProps) {
  const { colors } = useTheme();
  const { scrollY, threshold, onScroll, onTitleLayout } = useScrollHeader();
  const insets = useScreenInsets();
  const bottom = useBottomClearance();
  const focused = useScreenFocused();
  const [heroHeight, setHeroHeight] = useState(0);
  const heroEnd = Math.max(8, heroHeight - insets.paddingTop + space.sm);
  const [overHero, setOverHero] = useState(true);

  // Worklets only capture plain values: a React element (like `hero`)
  // carries React's internal FiberNode and can't be copied to the UI thread.
  const hasHero = !!hero;
  useAnimatedReaction(
    () => scrollY.value < heroEnd,
    (next, previous) => {
      if (hasHero && next !== previous) runOnJS(setOverHero)(next);
    },
    [heroEnd, hasHero],
  );

  const padded = (
    <>
      {largeTitle ? (
        <LargeTitle
          eyebrow={largeTitle.eyebrow}
          title={largeTitle.title}
          accessory={largeTitle.accessory}
          onLayout={onTitleLayout}
        />
      ) : null}
      {children}
    </>
  );
  const content = hero ? (
    <>
      <View onLayout={(event) => setHeroHeight(event.nativeEvent.layout.height)}>{hero}</View>
      <View style={[styles.heroContent, { marginTop: -heroOverlap }]}>{padded}</View>
    </>
  ) : (
    padded
  );
  const containerStyle = hero
    ? [{ paddingBottom: bottom }, contentStyle]
    : [insets, { paddingBottom: bottom }, styles.content, contentStyle];
  const refreshControl = onRefresh ? (
    <RefreshControl
      refreshing={!!refreshing}
      onRefresh={onRefresh}
      tintColor={colors.primary}
      colors={[colors.primary]}
      progressBackgroundColor={colors.surface}
      progressViewOffset={hero ? insets.paddingTop - TOP_BAR_HEIGHT : insets.paddingTop}
    />
  ) : undefined;

  return (
    <View style={[styles.flex, { backgroundColor: colors.background }]} testID={testID}>
      <ScreenBackground />
      {typeof background === "function" ? background(scrollY) : background}
      {keyboardAware ? (
        <KeyboardAwareScrollView
          bottomOffset={space["3xl"]}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={containerStyle}
          // A Reanimated ScrollView underneath: the UI-thread handler works.
          onScroll={onScroll}
          scrollEventThrottle={16}
          refreshControl={refreshControl}
        >
          {content}
        </KeyboardAwareScrollView>
      ) : (
        <Animated.ScrollView
          onScroll={onScroll}
          scrollEventThrottle={16}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={containerStyle}
          refreshControl={refreshControl}
        >
          {content}
        </Animated.ScrollView>
      )}
      {hero && focused ? <StatusBar style={overHero ? "light" : "dark"} /> : null}
      <TopBar
        scrollY={scrollY}
        threshold={hero ? heroEnd : largeTitle ? threshold : 8}
        title={title}
        titleVisibility={hero || largeTitle ? "onScroll" : "always"}
        onBack={onBack}
        leading={leading}
        actions={actions}
      />
    </View>
  );
}

interface FormScreenProps {
  title: string;
  onClose: () => void;
  children: ReactNode;
  // The CTA (and anything that must stay next to it) — stuck above the
  // keyboard while typing.
  footer: ReactNode;
  testID?: string;
}

// Modal task screen (new/edit forms): sheet header with the close button,
// keyboard-aware scrolling that keeps the focused field in view, and the
// action bar glued to the top of the keyboard.
export function FormScreen({ title, onClose, children, footer, testID }: FormScreenProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.flex, { backgroundColor: colors.background }]} testID={testID}>
      <ScreenBackground />
      <SheetHeader title={title} onClose={onClose} topInset={insets.top} />
      <KeyboardAwareScrollView
        bottomOffset={space["6xl"] + space["2xl"]}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.form}
      >
        {children}
      </KeyboardAwareScrollView>
      <KeyboardStickyView offset={{ closed: 0, opened: insets.bottom }}>
        <ActionBar>{footer}</ActionBar>
      </KeyboardStickyView>
    </View>
  );
}

export function SheetHeader({
  title,
  onClose,
  topInset = 0,
}: {
  title: string;
  onClose: () => void;
  topInset?: number;
}) {
  const { colors } = useTheme();
  return (
    <View style={[styles.sheetHeader, { paddingTop: topInset + space.sm }]}>
      <View style={[styles.handle, { backgroundColor: colors.border }]} />
      <View style={styles.sheetHeaderRow}>
        <View style={styles.sheetSide}>
          <IconButton
            testID="header-close"
            icon="close"
            accessibilityLabel="Fechar"
            variant="soft"
            onPress={onClose}
          />
        </View>
        <Text
          variant="title3"
          align="center"
          accessibilityRole="header"
          numberOfLines={1}
          style={styles.sheetTitle}
        >
          {title}
        </Text>
        <View style={styles.sheetSide} />
      </View>
    </View>
  );
}

// Bottom bar for the screen's main action, on a white sheet edge.
export function ActionBar({
  children,
  onLayout,
}: {
  children: ReactNode;
  onLayout?: (event: LayoutChangeEvent) => void;
}) {
  const { colors, elevation } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <View
      onLayout={onLayout}
      style={[
        styles.actionBar,
        { backgroundColor: colors.surface, paddingBottom: insets.bottom + space.md },
        elevation("lg"),
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    width: "100%",
    maxWidth: layout.maxContentWidth,
    alignSelf: "center",
  },
  heroContent: {
    width: "100%",
    maxWidth: layout.maxContentWidth,
    alignSelf: "center",
    paddingHorizontal: layout.screenPadding,
  },
  form: {
    width: "100%",
    maxWidth: layout.maxContentWidth,
    alignSelf: "center",
    paddingHorizontal: layout.screenPadding,
    paddingTop: space.md,
    paddingBottom: space["3xl"],
    gap: space.xl,
  },
  sheetHeader: {
    paddingHorizontal: layout.screenPadding,
    paddingBottom: space.sm,
    gap: space.sm,
  },
  handle: {
    alignSelf: "center",
    width: 40,
    height: 5,
    borderRadius: radius.full,
  },
  sheetHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
  },
  sheetSide: {
    width: 44,
  },
  sheetTitle: {
    flex: 1,
  },
  actionBar: {
    paddingHorizontal: layout.screenPadding,
    paddingTop: space.lg,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    gap: space.md,
  },
});
