import { LinearGradient } from "expo-linear-gradient";
import { StatusBar } from "expo-status-bar";
import type { ReactNode } from "react";
import { Image, StyleSheet, View } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Circle } from "react-native-svg";

import { useScreenFocused } from "../../lib/use-screen-focused";
import { layout, radius, space, useTheme } from "../../theme";

import { IconButton } from "./IconButton";
import { ScreenBackground } from "./Surfaces";
import { Text } from "./Text";

// The client's "M" mark (approved as the app icon), shown on the hero.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const LOGO = require("../../../assets/splash-icon.png") as number;

interface AuthLayoutProps {
  title: string;
  subtitle?: string;
  // Large hero with the wordmark (Entrar) or a compact one (other steps).
  hero?: "large" | "compact";
  onBack?: () => void;
  children: ReactNode;
  // Links under the card ("Não tem uma conta? Criar conta").
  footer?: ReactNode;
}

// Entry screens (design/telas.md §4, §5, §21, §22): the brand gradient
// hero with the Mony mark, and the form on a white card riding over its
// rounded edge. Keyboard-aware: the focused field and the CTA stay above
// the keyboard.
export function AuthLayout({
  title,
  subtitle,
  hero = "compact",
  onBack,
  children,
  footer,
}: AuthLayoutProps) {
  const { colors, gradients, elevation } = useTheme();
  const insets = useSafeAreaInsets();
  const focused = useScreenFocused();
  const large = hero === "large";

  return (
    <View style={[styles.flex, { backgroundColor: colors.background }]}>
      <ScreenBackground />
      {focused ? <StatusBar style="light" /> : null}
      <KeyboardAwareScrollView
        bottomOffset={space["3xl"]}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + space["2xl"] }]}
      >
        <View
          style={[
            styles.hero,
            large ? styles.heroLarge : styles.heroCompact,
            { paddingTop: insets.top + space.xl },
          ]}
        >
          <LinearGradient
            colors={gradients.balance}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          <Rings />
          <View
            style={[
              styles.logo,
              large ? styles.logoLarge : null,
              { backgroundColor: colors.surface },
              elevation("lg"),
            ]}
          >
            <Image
              source={LOGO}
              style={large ? styles.logoImageLarge : styles.logoImage}
              resizeMode="contain"
              accessible
              accessibilityLabel="Mony"
            />
          </View>
          {large ? (
            <View style={styles.wordmark}>
              <Text variant="title1" color={colors.onGlass}>
                Mony
              </Text>
              <Text variant="callout" color={colors.onGlassMuted} align="center">
                Suas finanças em ordem, num lugar só.
              </Text>
            </View>
          ) : null}
        </View>

        <View style={[styles.card, { backgroundColor: colors.surface }, elevation("lg")]}>
          <View style={styles.heading}>
            <Text variant="title1" accessibilityRole="header">
              {title}
            </Text>
            {subtitle ? (
              <Text variant="callout" tone="muted">
                {subtitle}
              </Text>
            ) : null}
          </View>
          {children}
        </View>

        {footer ? <View style={styles.footer}>{footer}</View> : null}
      </KeyboardAwareScrollView>

      {onBack ? (
        <View style={[styles.back, { top: insets.top + space.sm }]}>
          <IconButton
            testID="header-back"
            icon="chevron-back"
            variant="overlay"
            accessibilityLabel="Voltar"
            onPress={onBack}
          />
        </View>
      ) : null}
    </View>
  );
}

function Rings() {
  const { colors } = useTheme();
  return (
    <Svg style={StyleSheet.absoluteFill} pointerEvents="none">
      <Circle
        cx="92%"
        cy="18%"
        r={130}
        stroke={colors.onGlass}
        strokeOpacity={0.12}
        strokeWidth={1.5}
        fill="none"
      />
      <Circle
        cx="92%"
        cy="18%"
        r={80}
        stroke={colors.onGlass}
        strokeOpacity={0.14}
        strokeWidth={1.5}
        fill="none"
      />
      <Circle cx="6%" cy="100%" r={120} fill={colors.onGlass} fillOpacity={0.05} />
    </Svg>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
  },
  hero: {
    alignItems: "center",
    borderBottomLeftRadius: radius.xl + 8,
    borderBottomRightRadius: radius.xl + 8,
    overflow: "hidden",
    gap: space.lg,
  },
  heroLarge: {
    paddingBottom: space["6xl"] + space["2xl"],
  },
  heroCompact: {
    paddingBottom: space["6xl"],
  },
  logo: {
    width: 64,
    height: 64,
    borderRadius: radius.lg,
    alignItems: "center",
    justifyContent: "center",
  },
  logoLarge: {
    width: 84,
    height: 84,
    borderRadius: radius.xl,
  },
  logoImage: {
    width: 44,
    height: 44,
  },
  logoImageLarge: {
    width: 58,
    height: 58,
  },
  wordmark: {
    alignItems: "center",
    gap: space.xxs,
    paddingHorizontal: space["2xl"],
  },
  card: {
    marginTop: -space["5xl"],
    marginHorizontal: layout.screenPadding,
    width: "auto",
    maxWidth: layout.maxContentWidth,
    alignSelf: "stretch",
    borderRadius: radius.xl,
    padding: space.xl,
    gap: space.xl,
  },
  heading: {
    gap: space.xs,
  },
  footer: {
    alignItems: "center",
    paddingTop: space.xl,
    paddingHorizontal: layout.screenPadding,
    gap: space.sm,
  },
  back: {
    position: "absolute",
    left: layout.screenPadding,
  },
});
