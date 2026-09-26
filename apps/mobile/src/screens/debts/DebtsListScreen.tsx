import type { Debt, DebtStatus } from "@mony/shared-types";
import { useNavigation } from "@react-navigation/native";
import { useQuery } from "@tanstack/react-query";
import { StyleSheet, View } from "react-native";

import { DebtCard, NotebookSwitch } from "../../components/domain";
import {
  Card,
  EmptyState,
  ErrorState,
  IconButton,
  ScrollScreen,
  Skeleton,
  Text,
  Touchable,
} from "../../components/ui";
import { apiFetch } from "../../lib/api-client";
import { formatMoney, spokenMoney, toCents } from "../../lib/money-display";
import { useRefetchOnFocus } from "../../lib/use-refetch-on-focus";
import { useWorkspaceStore } from "../../lib/workspace-store";
import type { AppStackNavigation } from "../../navigation/RootNavigator";
import { space, useTheme } from "../../theme";

// Most urgent first.
const SECTIONS: Array<{ status: DebtStatus; title: string }> = [
  { status: "OVERDUE", title: "Atrasadas" },
  { status: "ACTIVE", title: "Ativas" },
  { status: "PAID_OFF", title: "Quitadas" },
];

// Dívidas (design/telas.md §9): what's still owed across all debts on top,
// then one card per debt, overdue ones first.
export function DebtsListScreen() {
  const navigation = useNavigation<AppStackNavigation>();
  const { colors } = useTheme();
  const activeWorkspace = useWorkspaceStore((state) => state.activeWorkspace);

  // Workspace in the key so switching it from this screen refetches the
  // (workspace-scoped) list right away.
  const {
    data: debts,
    isLoading,
    isError,
    isRefetching,
    refetch,
  } = useQuery({
    queryKey: ["debts", activeWorkspace],
    queryFn: () => apiFetch<Debt[]>("/debts"),
  });
  useRefetchOnFocus(refetch);

  const list = debts ?? [];
  const open = list.filter((debt) => debt.status !== "PAID_OFF");
  const owed = open.reduce((sum, debt) => sum + toCents(debt.remainingAmount), 0) / 100;
  const overdueCount = list.filter((debt) => debt.status === "OVERDUE").length;

  return (
    <ScrollScreen
      title="Dívidas"
      onBack={() => navigation.goBack()}
      actions={
        <IconButton
          testID="add-debt-button"
          icon="add"
          variant="soft"
          tone="primary"
          accessibilityLabel="Nova dívida"
          onPress={() => navigation.navigate("DebtForm", undefined)}
        />
      }
      refreshing={isRefetching}
      onRefresh={() => void refetch()}
    >
      <View style={styles.notebook}>
        <Text variant="subhead" tone="muted" style={styles.flex}>
          Caderno
        </Text>
        <NotebookSwitch />
      </View>

      {isLoading ? (
        <View style={styles.list} accessibilityLabel="Carregando dívidas">
          {[0, 1, 2].map((index) => (
            <Skeleton key={index} height={150} radius="lg" />
          ))}
        </View>
      ) : isError ? (
        <ErrorState onRetry={() => void refetch()} />
      ) : list.length === 0 ? (
        <EmptyState
          image="emptyDebts"
          icon="card-outline"
          title="Nenhuma dívida ainda."
          message="Parcelou alguma coisa? Registre aqui e acompanhe cada parcela."
          action={{
            label: "Nova dívida",
            onPress: () => navigation.navigate("DebtForm", undefined),
          }}
        />
      ) : (
        <>
          {open.length > 0 ? (
            <Card style={styles.summary}>
              <Text variant="subhead" tone="muted">
                Saldo devedor
              </Text>
              <Text
                variant="numeralLarge"
                accessibilityLabel={`Saldo devedor: ${spokenMoney(owed)}`}
              >
                {formatMoney(owed)}
              </Text>
              <Text variant="footnote" tone={overdueCount > 0 ? "danger" : "muted"}>
                {open.length} {open.length === 1 ? "dívida em aberto" : "dívidas em aberto"}
                {overdueCount > 0
                  ? ` · ${overdueCount} ${overdueCount === 1 ? "atrasada" : "atrasadas"}`
                  : ""}
              </Text>
            </Card>
          ) : null}
          {SECTIONS.map(({ status, title }) => {
            const sectionDebts = list.filter((debt) => debt.status === status);
            if (sectionDebts.length === 0) return null;
            return (
              <View key={status} style={styles.section} testID={`debt-section-${status}`}>
                <Text
                  variant="title2"
                  accessibilityRole="header"
                  color={status === "OVERDUE" ? colors.danger : undefined}
                >
                  {title}
                </Text>
                <View style={styles.list}>
                  {sectionDebts.map((debt) => (
                    <Touchable
                      key={debt.id}
                      testID={`debt-row-${debt.id}`}
                      feedback="sink"
                      accessibilityRole="button"
                      accessibilityLabel={debt.name}
                      onPress={() => navigation.navigate("DebtDetail", { debtId: debt.id })}
                    >
                      <DebtCard debt={debt} />
                    </Touchable>
                  ))}
                </View>
              </View>
            );
          })}
        </>
      )}
    </ScrollScreen>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  notebook: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
    marginBottom: space.lg,
  },
  summary: {
    gap: space.xs,
    marginBottom: space["2xl"],
  },
  section: {
    gap: space.md,
    marginBottom: space["2xl"],
  },
  list: {
    gap: space.md,
  },
});
