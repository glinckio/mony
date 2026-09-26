import type { DashboardData } from "@mony/shared-types";
import type { ReactNode } from "react";
import { StyleSheet, View } from "react-native";

import { formatMoney } from "../../lib/money-display";
import { space, useTheme } from "../../theme";
import type { IconName } from "../ui/Icon";
import { Card, IconBadge, ProgressBar } from "../ui/Surfaces";
import { Text } from "../ui/Text";

interface SummaryRowSpec {
  key: string;
  icon: IconName;
  color: string;
  label: string;
  value: string;
  valueColor?: string;
  testID?: string;
  extra?: ReactNode;
}

// The figures behind the balance as a white card of rows (icon badge,
// label, value) — like the reference's accounts list.
export function PeriodSummary({ data }: { data: DashboardData }) {
  const { colors } = useTheme();
  const { summary, averageDailyExpense } = data;
  const ratioPercent = Math.round(summary.expenseRatio * 100);
  const rows: SummaryRowSpec[] = [
    {
      key: "income",
      icon: "arrow-down",
      color: colors.success,
      label: "Receitas",
      value: `+ ${formatMoney(summary.totalIncome)}`,
      valueColor: colors.success,
      testID: "dashboard-income",
    },
    {
      key: "paid",
      icon: "arrow-up",
      color: colors.danger,
      label: "Despesas pagas",
      value: `− ${formatMoney(summary.totalExpensesPaid)}`,
      valueColor: colors.danger,
      testID: "dashboard-expenses",
    },
    {
      key: "pending",
      icon: "time-outline",
      color: colors.warning,
      label: "A pagar",
      value: formatMoney(summary.totalExpensesPending),
      testID: "dashboard-pending",
    },
    {
      key: "ratio",
      icon: "pie-chart-outline",
      color: colors.primary,
      label: "Renda comprometida",
      value: `${ratioPercent}%`,
      extra: (
        <ProgressBar
          percent={ratioPercent}
          tone={ratioPercent > 100 ? "danger" : "brand"}
          height={6}
          accessibilityLabel={`Renda comprometida: ${ratioPercent}%`}
        />
      ),
    },
    {
      key: "average",
      icon: "calendar-outline",
      color: colors.accent,
      label: "Gasto médio por dia",
      value: formatMoney(averageDailyExpense),
    },
  ];

  return (
    <Card padded={false} style={styles.summary}>
      {rows.map((row, index) => (
        <View
          key={row.key}
          style={[
            styles.summaryRow,
            index > 0 && {
              borderTopColor: colors.border,
              borderTopWidth: StyleSheet.hairlineWidth * 2,
            },
          ]}
        >
          <IconBadge icon={row.icon} color={row.color} size={40} />
          <View style={styles.summaryText}>
            <View style={styles.summaryLine}>
              <Text variant="bodyStrong" style={styles.flex} numberOfLines={1}>
                {row.label}
              </Text>
              <Text variant="numeral" color={row.valueColor} testID={row.testID}>
                {row.value}
              </Text>
            </View>
            {row.extra}
          </View>
        </View>
      ))}
    </Card>
  );
}

const styles = StyleSheet.create({
  summary: {
    paddingHorizontal: space.lg,
  },
  summaryRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
    paddingVertical: space.md,
  },
  summaryText: {
    flex: 1,
    gap: space.sm,
  },
  summaryLine: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
  },
  flex: {
    flex: 1,
  },
});
