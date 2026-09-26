import type { DashboardData } from "@mony/shared-types";
import { LinearGradient } from "expo-linear-gradient";
import { useState, type ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Circle, Defs, RadialGradient, Rect, Stop } from "react-native-svg";

import { spokenMoney, toCents } from "../../lib/money-display";
import { layout, radius, space, useTheme } from "../../theme";
import { Button } from "../ui/Button";
import { Icon } from "../ui/Icon";
import { Text } from "../ui/Text";

import { MoneyHero } from "./MoneyHero";

export type BalanceHeroState =
  | { kind: "ready"; data: DashboardData; periodLabel: string; comparisonLabel: string }
  | { kind: "loading" }
  | { kind: "error"; onRetry: () => void }
  | { kind: "pickDates" };

interface BalanceHeroProps {
  eyebrow: string;
  name: string;
  avatar: ReactNode;
  // Glass period selector and notebook switch.
  periodControl: ReactNode;
  notebookSwitch: ReactNode;
  state: BalanceHeroState;
  // Bottom space left for the card that overlaps the hero's edge.
  overlap: number;
  // Bleeds under the status bar (screen use); off for previews.
  bleedTop?: boolean;
}

// Início's hero banner: the brand gradient bleeding to the top edge (under
// the status bar) with rounded bottom corners; greeting and avatar, the
// period selector in glass, and the period's balance in white. Static
// decoration only — a soft light and two thin rings, no moving effect.
export function BalanceHero({
  eyebrow,
  name,
  avatar,
  periodControl,
  notebookSwitch,
  state,
  overlap,
  bleedTop = true,
}: BalanceHeroProps) {
  const { colors, gradients } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View
      testID="dashboard-hero"
      style={[
        styles.hero,
        { paddingTop: (bleedTop ? insets.top : 0) + space.md, paddingBottom: overlap + space.xl },
        bleedTop ? null : styles.preview,
      ]}
    >
      <LinearGradient
        colors={gradients.balance}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <Decoration />

      <View style={styles.inner}>
        <View style={styles.greeting}>
          {avatar}
          <View style={styles.flex}>
            <Text variant="callout" color={colors.onGlassMuted} numberOfLines={1}>
              {eyebrow}
            </Text>
            <Text
              variant="title2"
              color={colors.onGlass}
              numberOfLines={1}
              accessibilityRole="header"
            >
              {name}
            </Text>
          </View>
        </View>

        {periodControl}

        <View style={styles.balance}>
          <View style={styles.labelRow}>
            <Text
              variant="subhead"
              color={colors.onGlassMuted}
              style={styles.flex}
              numberOfLines={1}
            >
              {state.kind === "ready" ? `Saldo ${state.periodLabel}` : "Saldo"}
            </Text>
            {notebookSwitch}
          </View>
          <HeroBody state={state} />
        </View>
      </View>
    </View>
  );
}

function HeroBody({ state }: { state: BalanceHeroState }) {
  const { colors } = useTheme();
  if (state.kind === "loading") {
    return (
      <View style={styles.loading} accessibilityLabel="Carregando o saldo">
        <View style={[styles.ghost, styles.ghostAmount, { backgroundColor: colors.glassFill }]} />
        <View style={[styles.ghost, styles.ghostChip, { backgroundColor: colors.glassFill }]} />
      </View>
    );
  }
  if (state.kind === "pickDates") {
    return (
      <Text variant="bodyStrong" color={colors.onGlass}>
        Escolha as duas datas abaixo para ver o saldo do período.
      </Text>
    );
  }
  if (state.kind === "error") {
    return (
      <View style={styles.errorBox} accessibilityRole="alert">
        <Text variant="bodyStrong" color={colors.onGlass}>
          Não consegui carregar o saldo agora.
        </Text>
        <Button
          testID="retry-button"
          label="Tentar de novo"
          leftIcon="refresh"
          variant="secondary"
          size="sm"
          fullWidth={false}
          onPress={state.onRetry}
        />
      </View>
    );
  }

  const { data, periodLabel, comparisonLabel } = state;
  const change = data.previousPeriodIncomeChangePercent;
  const negative = toCents(data.summary.balance) < 0;
  return (
    <View testID="dashboard-summary-card" style={styles.amountBlock}>
      <MoneyHero
        testID="dashboard-balance"
        value={data.summary.balance}
        color={colors.onGlass}
        accessibilityLabel={`Saldo ${periodLabel}: ${spokenMoney(data.summary.balance)}`}
      />
      <View style={styles.chips}>
        {change !== null ? (
          <GlassChip
            testID="dashboard-comparison-badge"
            icon={change >= 0 ? "trending-up" : "trending-down"}
          >
            {`${change >= 0 ? "+" : "−"}${Math.abs(change).toFixed(1).replace(".", ",")}% de receita ${comparisonLabel}`}
          </GlassChip>
        ) : null}
        {negative ? <GlassChip icon="alert-circle">Saldo negativo</GlassChip> : null}
      </View>
    </View>
  );
}

function GlassChip({
  icon,
  children,
  testID,
}: {
  icon: React.ComponentProps<typeof Icon>["name"];
  children: string;
  testID?: string;
}) {
  const { colors } = useTheme();
  return (
    <View
      testID={testID}
      style={[styles.chip, { backgroundColor: colors.glassFill, borderColor: colors.glassBorder }]}
    >
      <Icon name={icon} size={14} color={colors.onGlass} />
      <Text variant="caption" color={colors.onGlass}>
        {children}
      </Text>
    </View>
  );
}

// A soft light in the top-left and two thin rings off the right edge.
function Decoration() {
  const { colors } = useTheme();
  const [size, setSize] = useState({ width: 0, height: 0 });
  const { width, height } = size;
  return (
    <View
      pointerEvents="none"
      style={StyleSheet.absoluteFill}
      onLayout={(event) => setSize(event.nativeEvent.layout)}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      {width > 0 ? (
        <Svg width={width} height={height}>
          <Defs>
            <RadialGradient id="hero-light" cx="12%" cy="0%" rx="70%" ry="80%">
              <Stop offset="0" stopColor={colors.onGlass} stopOpacity={0.26} />
              <Stop offset="1" stopColor={colors.onGlass} stopOpacity={0} />
            </RadialGradient>
          </Defs>
          <Rect width={width} height={height} fill="url(#hero-light)" />
          <Circle
            cx={width + 24}
            cy={height * 0.3}
            r={150}
            stroke={colors.onGlass}
            strokeOpacity={0.12}
            strokeWidth={1.5}
            fill="none"
          />
          <Circle
            cx={width + 24}
            cy={height * 0.3}
            r={96}
            stroke={colors.onGlass}
            strokeOpacity={0.14}
            strokeWidth={1.5}
            fill="none"
          />
          <Circle
            cx={width * 0.18}
            cy={height + 30}
            r={110}
            fill={colors.onGlass}
            fillOpacity={0.05}
          />
        </Svg>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  hero: {
    borderBottomLeftRadius: radius.xl + 8,
    borderBottomRightRadius: radius.xl + 8,
    overflow: "hidden",
  },
  preview: {
    borderRadius: radius.xl,
  },
  inner: {
    width: "100%",
    maxWidth: layout.maxContentWidth,
    alignSelf: "center",
    paddingHorizontal: layout.screenPadding,
    gap: space.xl,
  },
  greeting: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
    minHeight: 48,
  },
  flex: {
    flex: 1,
  },
  balance: {
    gap: space.xs,
  },
  labelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
  },
  amountBlock: {
    gap: space.sm,
  },
  chips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: space.sm,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.xs,
    paddingHorizontal: space.sm + 2,
    paddingVertical: space.xs,
    borderRadius: radius.full,
    borderWidth: 1,
  },
  loading: {
    gap: space.sm,
    paddingVertical: space.xs,
  },
  ghost: {
    borderRadius: radius.sm,
  },
  ghostAmount: {
    width: "58%",
    height: 40,
  },
  ghostChip: {
    width: "46%",
    height: 24,
    borderRadius: radius.full,
  },
  errorBox: {
    gap: space.md,
    alignItems: "flex-start",
  },
});
