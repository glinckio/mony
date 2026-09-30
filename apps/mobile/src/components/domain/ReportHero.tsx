import type { Report } from "@mony/shared-types";
import { StyleSheet, View } from "react-native";

import { formatSigned, spokenMoney } from "../../lib/money-display";
import { percentLabel, summaryRatio } from "../../lib/report-display";
import { radius, space, useTheme } from "../../theme";
import { Icon } from "../ui/Icon";
import { Gradient, ProgressBar } from "../ui/Surfaces";
import { Text } from "../ui/Text";

import { HeroDecoration } from "./HeroDecoration";
import { MoneyHero } from "./MoneyHero";

interface ReportHeroProps {
  summary: Report["summary"];
  // "01/09 – 30/09/2026 · Pessoal"
  periodLabel: string;
  testID?: string;
}

// Relatórios' "Resumo do período" as the screen's hero (brand gradient,
// glass): the period's balance big, income and paid expenses as glass
// tiles, and legacy's "Despesas em relação às receitas" bar with its
// 70% / 90% colors and messages.
export function ReportHero({ summary, periodLabel, testID }: ReportHeroProps) {
  const { colors, elevation } = useTheme();
  const { tone, message } = summaryRatio(summary.expenseRatio);
  const percent = percentLabel(summary.expenseRatio);
  return (
    <View style={[styles.shadow, elevation("md")]} testID={testID}>
      <Gradient name="balance" style={styles.hero}>
        <HeroDecoration />
        <View style={styles.content}>
          <View
            style={[
              styles.chip,
              { backgroundColor: colors.glassFill, borderColor: colors.glassBorder },
            ]}
          >
            <Icon name="calendar-outline" size="sm" color={colors.onGlass} />
            <Text variant="label" color={colors.onGlass}>
              {periodLabel}
            </Text>
          </View>

          <View
            style={styles.balance}
            accessible
            accessibilityLabel={`Saldo do período: ${spokenMoney(summary.balance)}`}
          >
            <Text variant="subhead" color={colors.onGlassMuted}>
              Saldo do período
            </Text>
            <MoneyHero value={summary.balance} variant="display" color={colors.onGlass} />
          </View>

          <View style={styles.tiles}>
            <Tile
              label="Receitas"
              value={formatSigned(summary.totalIncome, "in")}
              spoken={`Receitas: ${spokenMoney(summary.totalIncome)}`}
            />
            <Tile
              label="Despesas pagas"
              value={formatSigned(summary.totalExpensesPaid, "out")}
              spoken={`Despesas pagas: ${spokenMoney(summary.totalExpensesPaid)}`}
            />
          </View>

          <View
            style={styles.ratio}
            accessible
            accessibilityLabel={`Despesas em relação às receitas: ${percent}. ${message}`}
          >
            <View style={styles.ratioHeader}>
              <Text variant="footnote" color={colors.onGlassMuted} style={styles.flex}>
                Despesas em relação às receitas
              </Text>
              <Text variant="numeral" color={colors.onGlass}>
                {percent}
              </Text>
            </View>
            <ProgressBar
              percent={Math.min(100, summary.expenseRatio * 100)}
              tone={tone}
              height={8}
            />
            <Text variant="footnote" color={colors.onGlassMuted}>
              {message}
            </Text>
          </View>
        </View>
      </Gradient>
    </View>
  );
}

function Tile({ label, value, spoken }: { label: string; value: string; spoken: string }) {
  const { colors } = useTheme();
  return (
    <View
      style={[styles.tile, { backgroundColor: colors.glassFill, borderColor: colors.glassBorder }]}
      accessible
      accessibilityLabel={spoken}
    >
      <Text variant="caption" color={colors.onGlassMuted}>
        {label}
      </Text>
      <Text variant="numeral" color={colors.onGlass} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  shadow: {
    borderRadius: radius.xl,
  },
  hero: {
    borderRadius: radius.xl,
    overflow: "hidden",
  },
  content: {
    padding: space.xl,
    gap: space.lg,
  },
  chip: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: space.xs,
    paddingHorizontal: space.sm + 2,
    paddingVertical: space.xs,
    borderRadius: radius.full,
    borderWidth: 1,
  },
  balance: {
    gap: space.xxs,
  },
  tiles: {
    flexDirection: "row",
    gap: space.sm,
  },
  tile: {
    flex: 1,
    gap: space.xxs,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    borderRadius: radius.md,
    borderWidth: 1,
  },
  ratio: {
    gap: space.sm,
  },
  ratioHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.sm,
  },
  flex: {
    flex: 1,
  },
});
