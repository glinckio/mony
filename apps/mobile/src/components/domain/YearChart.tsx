import type { DashboardData } from "@mony/shared-types";
import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";

import { formatSigned, spokenMoney } from "../../lib/money-display";
import { radius, space, useTheme } from "../../theme";
import { haptic } from "../../theme/haptics";
import { Text } from "../ui/Text";

import { ChartBar } from "./ChartBar";

const MONTHS = ["J", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"];
const MONTHS_LONG = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];
const CHART_HEIGHT = 110;

interface YearChartProps {
  data: DashboardData["yearlyBreakdown"];
  currentMonth?: number;
  year?: number;
}

// Income (green gradient) × paid expenses (indigo gradient) per month,
// rounded bars, no axis. The selected month (current at first) sits on a
// soft indigo column and its figures read above the chart.
export function YearChart({
  data,
  currentMonth = new Date().getMonth() + 1,
  year = new Date().getFullYear(),
}: YearChartProps) {
  const { colors, gradients } = useTheme();
  const [selected, setSelected] = useState(currentMonth);
  const max = Math.max(
    1,
    ...data.flatMap((month) => [Number(month.income), Number(month.expensesPaid)]),
  );
  const empty = data.every(
    (month) => Number(month.income) === 0 && Number(month.expensesPaid) === 0,
  );
  const selectedMonth = data.find((month) => month.month === selected);

  return (
    <View style={styles.container} testID="dashboard-yearly-chart">
      <View style={styles.detail} accessibilityLiveRegion="polite">
        {empty ? (
          <Text variant="footnote" tone="muted">
            Nada lançado em {year} ainda.
          </Text>
        ) : selectedMonth ? (
          <>
            <Text variant="subhead" style={styles.flex}>
              {MONTHS_LONG[selectedMonth.month - 1]}
            </Text>
            <Text variant="subhead" tone="success" style={styles.tabular}>
              {formatSigned(selectedMonth.income, "in")}
            </Text>
            <Text variant="subhead" tone="danger" style={styles.tabular}>
              {formatSigned(selectedMonth.expensesPaid, "out")}
            </Text>
          </>
        ) : null}
      </View>

      <View style={styles.chart}>
        {data.map((month, index) => {
          const isSelected = month.month === selected;
          return (
            <Pressable
              key={month.month}
              style={styles.column}
              onPress={() => {
                haptic.selection();
                setSelected(month.month);
              }}
              accessibilityRole="button"
              accessibilityState={{ selected: isSelected }}
              accessibilityLabel={`${MONTHS_LONG[month.month - 1]}: receitas ${spokenMoney(
                month.income,
              )}, despesas ${spokenMoney(month.expensesPaid)}`}
            >
              {isSelected ? (
                <View style={[styles.band, { backgroundColor: colors.primaryMuted }]} />
              ) : null}
              <View style={styles.bars}>
                <ChartBar
                  value={Number(month.income)}
                  max={max}
                  height={CHART_HEIGHT}
                  gradient={gradients.income}
                  index={index}
                />
                <ChartBar
                  value={Number(month.expensesPaid)}
                  max={max}
                  height={CHART_HEIGHT}
                  gradient={gradients.brand}
                  index={index}
                />
              </View>
              <Text variant="caption" color={isSelected ? colors.primary : colors.textSubtle}>
                {MONTHS[month.month - 1]}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.legend} accessibilityElementsHidden importantForAccessibility="no">
        <View style={[styles.swatch, { backgroundColor: colors.success }]} />
        <Text variant="caption" tone="muted">
          Receitas
        </Text>
        <View style={[styles.swatch, { backgroundColor: colors.primary }]} />
        <Text variant="caption" tone="muted">
          Despesas pagas
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: space.lg,
  },
  detail: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
    minHeight: 20,
  },
  flex: {
    flex: 1,
  },
  tabular: {
    fontVariant: ["tabular-nums"],
  },
  chart: {
    flexDirection: "row",
    alignItems: "flex-end",
    height: CHART_HEIGHT + 34,
  },
  column: {
    flex: 1,
    alignItems: "center",
    justifyContent: "flex-end",
    gap: space.sm,
    height: "100%",
    paddingBottom: 2,
  },
  band: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 1,
    right: 1,
    borderRadius: radius.sm,
  },
  bars: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 3,
  },
  legend: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.sm,
  },
  swatch: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});
