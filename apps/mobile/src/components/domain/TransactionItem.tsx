import type { Category, Transaction } from "@mony/shared-types";
import { memo } from "react";
import { StyleSheet, View } from "react-native";

import { formatMoney, spokenMoney } from "../../lib/money-display";
import { radius, space, useTheme } from "../../theme";
import { Icon, type IconName } from "../ui/Icon";
import { IconBadge } from "../ui/Surfaces";
import { SwipeRow } from "../ui/SwipeRow";
import { Text } from "../ui/Text";
import { Touchable } from "../ui/Touchable";

import { StatusPill } from "./StatusPill";

interface TransactionItemProps {
  transaction: Transaction;
  category?: Category;
  selected?: boolean;
  selectionMode?: boolean;
  // Entity-based callbacks, so a list can pass the same (stable) functions
  // to every row and the row's memo holds.
  onOpen?: (transaction: Transaction) => void;
  onToggleSelect?: (id: string) => void;
  // Expense only: paid ↔ to pay.
  onToggleStatus?: (transaction: Transaction) => void;
  onRequestDelete?: (id: string) => void;
  // Miniature (inside a confirmation): no actions, no swipe.
  compact?: boolean;
}

// A ledger entry as a white card row: the category's pastel badge, the
// description with the category under it, the signed amount (green in,
// red out) and — for expenses — the tappable paid / to-pay pill.
// Swiping left reveals "Excluir"; long press starts multi-selection.
export const TransactionItem = memo(function TransactionItem({
  transaction,
  category,
  selected = false,
  selectionMode = false,
  onOpen,
  onToggleSelect,
  onToggleStatus,
  onRequestDelete,
  compact = false,
}: TransactionItemProps) {
  const { colors, elevation } = useTheme();
  const income = transaction.type === "INCOME";
  const amountText = `${income ? "+" : "−"} ${formatMoney(transaction.amount)}`;
  const paid = transaction.status === "PAID";
  const badgeColor = category?.color ?? colors.primary;
  const badgeIcon: IconName =
    (category?.icon as IconName | undefined) ?? (income ? "arrow-down" : "arrow-up");
  const statusWord = income ? "receita" : paid ? "paga" : "a pagar";
  const select = onToggleSelect ? () => onToggleSelect(transaction.id) : undefined;
  const remove = onRequestDelete ? () => onRequestDelete(transaction.id) : undefined;
  const press = selectionMode ? select : onOpen ? () => onOpen(transaction) : undefined;
  // The pill can't be focused inside the row, so screen readers get it as
  // a row action too.
  const toggleStatus =
    !income && !selectionMode && onToggleStatus ? () => onToggleStatus(transaction) : undefined;

  const content = (
    <Touchable
      testID={compact ? undefined : `transaction-row-${transaction.id}`}
      feedback={compact ? "none" : "sink"}
      disabled={compact}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={`${transaction.description}, ${income ? "receita" : "despesa"} de ${spokenMoney(
        transaction.amount,
      )}${category ? `, ${category.name}` : ""}, ${statusWord}`}
      accessibilityActions={
        compact
          ? undefined
          : [
              { name: "longpress", label: "Selecionar" },
              ...(toggleStatus
                ? [
                    {
                      name: "toggleStatus",
                      label: paid ? "Marcar como pendente" : "Marcar como pago",
                    },
                  ]
                : []),
              ...(remove ? [{ name: "delete", label: "Excluir lançamento" }] : []),
            ]
      }
      onAccessibilityAction={(event) => {
        if (event.nativeEvent.actionName === "delete") remove?.();
        if (event.nativeEvent.actionName === "longpress") select?.();
        if (event.nativeEvent.actionName === "toggleStatus") toggleStatus?.();
      }}
      onPress={press}
      onLongPress={select}
      delayLongPress={320}
      style={[
        styles.row,
        compact ? null : [styles.card, { backgroundColor: colors.surface }, elevation("sm")],
        selected && { borderColor: colors.primary, backgroundColor: colors.primaryMuted },
      ]}
    >
      {selectionMode ? (
        <View
          style={[
            styles.check,
            selected
              ? { backgroundColor: colors.primary, borderColor: colors.primary }
              : { borderColor: colors.borderStrong },
          ]}
        >
          {selected ? <Icon name="checkmark" size="sm" color={colors.onPrimary} /> : null}
        </View>
      ) : (
        <IconBadge icon={badgeIcon} color={badgeColor} size={44} />
      )}

      <View style={styles.main}>
        <Text variant="bodyStrong" numberOfLines={1}>
          {transaction.description}
        </Text>
        <Text variant="footnote" tone="muted" numberOfLines={1}>
          {category?.name ?? (income ? "Receita" : "Despesa")}
          {transaction.recurring ? "  ·  Recorrente" : ""}
        </Text>
      </View>

      <View style={styles.side}>
        <Text variant="numeral" color={income ? colors.success : colors.danger} numberOfLines={1}>
          {amountText}
        </Text>
        {!income ? (
          <StatusPill
            kind={paid ? "paid" : "toPay"}
            testID={compact ? undefined : `toggle-status-${transaction.id}`}
            onPress={compact ? undefined : toggleStatus}
            accessibilityLabel={paid ? "Marcar como pendente" : "Marcar como pago"}
          />
        ) : null}
      </View>
    </Touchable>
  );

  if (compact) return content;
  // Always wrapped (swipe just disabled in selection mode), so entering or
  // leaving selection doesn't remount every row.
  return (
    <SwipeRow
      onDelete={remove}
      enabled={!selectionMode}
      deleteLabel="Excluir lançamento"
      deleteTestID={`delete-transaction-${transaction.id}`}
    >
      {content}
    </SwipeRow>
  );
});

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
    paddingVertical: space.md,
    paddingHorizontal: space.md + 2,
    minHeight: 72,
  },
  card: {
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: "transparent",
  },
  check: {
    width: 44,
    height: 44,
    borderRadius: radius.full,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  main: {
    flex: 1,
    gap: 2,
  },
  side: {
    alignItems: "flex-end",
    gap: space.xs,
  },
});
