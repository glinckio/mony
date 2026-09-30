import type { ReportMonth } from "@mony/shared-types";
import { memo } from "react";
import { StyleSheet, View } from "react-native";

import { formatMoney, formatSigned, spokenMoney } from "../../lib/money-display";
import { monthLabel, monthRatio, monthSpoken, percentLabel } from "../../lib/report-display";
import { space } from "../../theme";
import { ProgressBar } from "../ui/Surfaces";
import { Text } from "../ui/Text";

interface ReportMonthRowProps {
  month: ReportMonth;
  index: number;
}

// One line of Relatórios' "Resumo mensal" (legacy's table): the month
// and its balance on the left, income and paid expenses on the right,
// and the expenses/income bar with legacy's 80% / 100% colors.
export const ReportMonthRow = memo(function ReportMonthRow({ month, index }: ReportMonthRowProps) {
  const { ratio, tone } = monthRatio(month);
  const negative = Number(month.balance) < 0;
  return (
    <View
      style={styles.row}
      accessible
      accessibilityLabel={`${monthSpoken(month.month)}: receitas ${spokenMoney(month.income)}, despesas ${spokenMoney(month.expensesPaid)}, saldo ${spokenMoney(month.balance)}, despesas ${percentLabel(ratio)} das receitas`}
    >
      <View style={styles.top}>
        <View style={styles.left}>
          <Text variant="bodyStrong">{monthLabel(month.month)}</Text>
          <Text variant="footnote" tone={negative ? "danger" : "muted"}>
            Saldo {formatMoney(month.balance)}
          </Text>
        </View>
        <View style={styles.right}>
          <Text variant="numeral" tone="success">
            {formatSigned(month.income, "in")}
          </Text>
          <Text variant="numeral" tone="danger">
            {formatSigned(month.expensesPaid, "out")}
          </Text>
        </View>
      </View>
      <View style={styles.ratio}>
        <View style={styles.flex}>
          <ProgressBar percent={Math.min(100, ratio * 100)} tone={tone} height={6} index={index} />
        </View>
        <Text variant="caption" tone="muted" align="right" style={styles.percent}>
          {percentLabel(ratio)}
        </Text>
      </View>
    </View>
  );
});

const PERCENT_WIDTH = 52;

const styles = StyleSheet.create({
  row: {
    gap: space.sm,
    paddingVertical: space.md,
  },
  top: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: space.md,
  },
  left: {
    flex: 1,
    gap: space.xxs,
  },
  right: {
    alignItems: "flex-end",
    gap: space.xxs,
  },
  ratio: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.sm,
  },
  flex: {
    flex: 1,
  },
  percent: {
    width: PERCENT_WIDTH,
  },
});
