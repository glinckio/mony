import type { Debt } from "@mony/shared-types";
import { StyleSheet, View } from "react-native";

import { DEBT_STATUS_LABELS, installmentProgressPercent } from "../../lib/debt-display";
import { formatMoney, spokenMoney } from "../../lib/money-display";
import { space, useTheme } from "../../theme";
import { Card, IconBadge, ProgressBar } from "../ui/Surfaces";
import { Text } from "../ui/Text";

import { StatusPill, type StatusKind } from "./StatusPill";

const STATUS_KIND: Record<Debt["status"], StatusKind> = {
  ACTIVE: "debtActive",
  OVERDUE: "debtOverdue",
  PAID_OFF: "debtPaidOff",
};

// A debt as a white card: badge, name and status pill, what's left to pay
// in large figures, and the installments as a gradient bar.
export function DebtCard({ debt, color }: { debt: Debt; color?: string }) {
  const { colors } = useTheme();
  const paidOff = debt.status === "PAID_OFF";
  const overdue = debt.status === "OVERDUE";
  const percent = installmentProgressPercent(debt.paidInstallments, debt.totalInstallments);
  const badgeColor = overdue ? colors.danger : paidOff ? colors.success : (color ?? colors.primary);

  return (
    <Card style={[styles.card, paidOff && styles.dimmed]}>
      <View style={styles.header}>
        <IconBadge icon={paidOff ? "checkmark-done" : "card"} color={badgeColor} size={44} filled />
        <View style={styles.titleBlock}>
          <Text variant="title3" numberOfLines={1}>
            {debt.name}
          </Text>
          <Text variant="footnote" tone="muted">
            {debt.paidInstallments} de {debt.totalInstallments} parcelas pagas
          </Text>
        </View>
        <StatusPill
          kind={STATUS_KIND[debt.status]}
          testID={`debt-status-${debt.id}`}
          accessibilityLabel={DEBT_STATUS_LABELS[debt.status]}
        />
      </View>
      <View
        style={styles.amounts}
        accessible
        accessibilityLabel={`Restam ${spokenMoney(debt.remainingAmount)} de ${spokenMoney(debt.totalAmount)}`}
      >
        <View>
          <Text variant="footnote" tone="muted">
            {paidOff ? "Quitada" : "Restam"}
          </Text>
          <Text variant="numeralLarge" color={overdue ? colors.danger : undefined}>
            {formatMoney(debt.remainingAmount)}
          </Text>
        </View>
        <Text variant="footnote" tone="muted">
          de {formatMoney(debt.totalAmount)}
        </Text>
      </View>
      <ProgressBar
        testID={`debt-progress-${debt.id}`}
        percent={percent}
        tone={paidOff ? "success" : overdue ? "danger" : "brand"}
        accessibilityLabel={`${debt.paidInstallments} de ${debt.totalInstallments} parcelas pagas`}
      />
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: space.md,
  },
  dimmed: {
    opacity: 0.8,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
  },
  titleBlock: {
    flex: 1,
    gap: 1,
  },
  amounts: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    gap: space.md,
  },
});
