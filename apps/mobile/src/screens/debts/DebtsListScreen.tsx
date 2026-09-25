import { Ionicons } from "@expo/vector-icons";
import { formatCurrency, type Debt, type DebtStatus } from "@mony/shared-types";
import { color, radius, size as sizeTokens, spacing } from "@mony/ui-tokens";
import { useNavigation } from "@react-navigation/native";
import { useQuery } from "@tanstack/react-query";
import { StyleSheet, TouchableOpacity, View } from "react-native";

import { AppHeader, Badge, ProgressBar, Screen, Text } from "../../components/ui";
import { apiFetch } from "../../lib/api-client";
import {
  DEBT_STATUS_LABELS,
  DEBT_STATUS_TONES,
  installmentProgressPercent,
} from "../../lib/debt-display";
import { useRefetchOnFocus } from "../../lib/use-refetch-on-focus";
import { useWorkspaceStore } from "../../lib/workspace-store";
import type { AppStackNavigation } from "../../navigation/RootNavigator";

// Most urgent first.
const SECTIONS: Array<{ status: DebtStatus; title: string }> = [
  { status: "OVERDUE", title: "Atrasadas" },
  { status: "ACTIVE", title: "Ativas" },
  { status: "PAID_OFF", title: "Quitadas" },
];

export function DebtsListScreen() {
  const navigation = useNavigation<AppStackNavigation>();
  const activeWorkspace = useWorkspaceStore((state) => state.activeWorkspace);

  // Workspace in the key so switching it from this screen's header
  // refetches the (workspace-scoped) list right away.
  const {
    data: debts,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ["debts", activeWorkspace],
    queryFn: () => apiFetch<Debt[]>("/debts"),
  });
  useRefetchOnFocus(refetch);

  return (
    <Screen>
      <AppHeader
        title="Dívidas"
        onBack={() => navigation.goBack()}
        rightAccessory={
          <TouchableOpacity
            testID="add-debt-button"
            accessibilityRole="button"
            accessibilityLabel="Nova dívida"
            hitSlop={8}
            onPress={() => navigation.navigate("DebtForm", undefined)}
          >
            <Ionicons name="add-circle-outline" size={sizeTokens.iconLg} color={color.primary} />
          </TouchableOpacity>
        }
      />

      {isLoading ? (
        <Text variant="caption">Carregando...</Text>
      ) : isError ? (
        <Text variant="caption" color={color.danger}>
          Algo deu errado. Tente novamente.
        </Text>
      ) : (debts ?? []).length === 0 ? (
        <Text variant="caption" color={color.textSecondary}>
          Nenhuma dívida ainda.
        </Text>
      ) : (
        SECTIONS.map(({ status, title }) => {
          const sectionDebts = (debts ?? []).filter((debt) => debt.status === status);
          if (sectionDebts.length === 0) return null;
          return (
            <View key={status} style={styles.section} testID={`debt-section-${status}`}>
              <Text variant="bodyStrong">{title}</Text>
              {sectionDebts.map((debt) => (
                <DebtRow
                  key={debt.id}
                  debt={debt}
                  onPress={() => navigation.navigate("DebtDetail", { debtId: debt.id })}
                />
              ))}
            </View>
          );
        })
      )}
    </Screen>
  );
}

interface DebtRowProps {
  debt: Debt;
  onPress: () => void;
}

function DebtRow({ debt, onPress }: DebtRowProps) {
  return (
    <TouchableOpacity
      testID={`debt-row-${debt.id}`}
      accessibilityRole="button"
      accessibilityLabel={debt.name}
      style={styles.row}
      onPress={onPress}
    >
      <View style={styles.rowHeader}>
        <Text variant="bodyStrong" style={styles.rowTitle} numberOfLines={1}>
          {debt.name}
        </Text>
        <Badge
          testID={`debt-status-${debt.id}`}
          label={DEBT_STATUS_LABELS[debt.status]}
          tone={DEBT_STATUS_TONES[debt.status]}
        />
      </View>
      <ProgressBar
        testID={`debt-progress-${debt.id}`}
        percent={installmentProgressPercent(debt.paidInstallments, debt.totalInstallments)}
      />
      <Text variant="caption">
        {debt.paidInstallments} de {debt.totalInstallments} parcelas pagas
      </Text>
      <Text variant="caption">
        Restam {formatCurrency(debt.remainingAmount)} de {formatCurrency(debt.totalAmount)}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  row: {
    gap: spacing.xs,
    padding: spacing.md,
    backgroundColor: color.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: color.border,
  },
  rowHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  rowTitle: {
    flex: 1,
  },
});
