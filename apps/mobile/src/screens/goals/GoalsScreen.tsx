import type { Goal } from "@mony/shared-types";
import { useNavigation } from "@react-navigation/native";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { StyleSheet, View } from "react-native";

import { GoalProgress, NotebookSwitch } from "../../components/domain";
import {
  Card,
  ConfirmSheet,
  EmptyState,
  ErrorState,
  IconButton,
  ProgressBar,
  ScrollScreen,
  Skeleton,
  SwipeRow,
  Text,
  Touchable,
} from "../../components/ui";
import { apiFetch } from "../../lib/api-client";
import { formatMoney, spokenMoney, toCents } from "../../lib/money-display";
import { useToastStore } from "../../lib/toast-store";
import { useRefetchOnFocus } from "../../lib/use-refetch-on-focus";
import type { MainTabNavigation } from "../../navigation/RootNavigator";
import { space } from "../../theme";

// Compares against the DTO's own date-only ISO string format
// ("YYYY-MM-DD"), so no Date object / local-timezone parsing involved.
function todayISODate(): string {
  return new Date().toISOString().slice(0, 10);
}

function isOverdue(goal: Goal): boolean {
  return !goal.completed && !!goal.targetDate && goal.targetDate < todayISODate();
}

// Metas (design/telas.md §6): a summary card with everything saved so far
// (like the reference's monthly budget), then each goal as its own white
// card with the gradient bar; completed goals below. Swipe left deletes.
export function GoalsScreen() {
  const navigation = useNavigation<MainTabNavigation>();
  const queryClient = useQueryClient();
  const [pendingDelete, setPendingDelete] = useState<Goal | null>(null);
  const [deleting, setDeleting] = useState(false);

  const {
    data: goals,
    isLoading,
    isError,
    isRefetching,
    refetch,
  } = useQuery({
    queryKey: ["goals"],
    queryFn: () => apiFetch<Goal[]>("/goals"),
  });
  useRefetchOnFocus(refetch);

  const performDelete = async () => {
    if (!pendingDelete) return;
    setDeleting(true);
    try {
      await apiFetch(`/goals/${pendingDelete.id}`, { method: "DELETE" });
      setPendingDelete(null);
      await queryClient.invalidateQueries({ queryKey: ["goals"] });
    } catch {
      setPendingDelete(null);
      useToastStore.getState().show("Não foi possível excluir. Tente novamente.");
    } finally {
      setDeleting(false);
    }
  };

  const list = goals ?? [];
  const inProgress = list.filter((goal) => !goal.completed);
  const completed = list.filter((goal) => goal.completed);

  const renderGoal = (goal: Goal, index: number) => (
    <SwipeRow
      key={goal.id}
      onDelete={() => setPendingDelete(goal)}
      deleteLabel="Excluir meta"
      deleteTestID={`delete-goal-${goal.id}`}
    >
      <Touchable
        testID={`goal-row-${goal.id}`}
        feedback="sink"
        accessibilityRole="button"
        accessibilityActions={[{ name: "delete", label: "Excluir meta" }]}
        onAccessibilityAction={(event) => {
          if (event.nativeEvent.actionName === "delete") setPendingDelete(goal);
        }}
        onPress={() => navigation.navigate("GoalForm", { goal })}
      >
        <Card>
          <GoalProgress
            index={index}
            title={goal.title}
            currentAmount={goal.currentAmount}
            targetAmount={goal.targetAmount}
            targetDate={goal.targetDate}
            completed={goal.completed}
            overdue={isOverdue(goal)}
            progressTestID={`goal-progress-${goal.id}`}
            overdueTestID={`overdue-badge-${goal.id}`}
          />
        </Card>
      </Touchable>
    </SwipeRow>
  );

  return (
    <ScrollScreen
      title="Metas"
      actions={
        <IconButton
          testID="add-goal-button"
          icon="add"
          variant="soft"
          tone="primary"
          accessibilityLabel="Nova meta"
          onPress={() => navigation.navigate("GoalForm", undefined)}
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
        <View style={styles.list} accessibilityLabel="Carregando metas">
          <Skeleton height={120} radius="lg" />
          {[0, 1, 2].map((index) => (
            <Skeleton key={index} height={96} radius="lg" />
          ))}
        </View>
      ) : isError ? (
        <ErrorState onRetry={() => void refetch()} />
      ) : list.length === 0 ? (
        <EmptyState
          image="emptyGoals"
          icon="flag-outline"
          title="Nenhuma meta ainda."
          message="Toda economia começa com um número. Crie a primeira meta e acompanhe quanto já guardou."
          action={{
            label: "Criar meta",
            onPress: () => navigation.navigate("GoalForm", undefined),
          }}
        />
      ) : (
        <>
          <SavedSummary goals={inProgress} />
          {inProgress.length > 0 ? (
            <View style={styles.section}>
              <Text variant="title2" accessibilityRole="header">
                Em andamento
              </Text>
              <View style={styles.list}>{inProgress.map(renderGoal)}</View>
            </View>
          ) : null}
          {completed.length > 0 ? (
            <View style={styles.section}>
              <Text variant="title2" accessibilityRole="header">
                Concluídas
              </Text>
              <View style={styles.list}>{completed.map(renderGoal)}</View>
            </View>
          ) : null}
        </>
      )}

      <ConfirmSheet
        visible={pendingDelete !== null}
        title={pendingDelete ? `Excluir a meta "${pendingDelete.title}"?` : ""}
        message="O progresso registrado nela some junto."
        preview={
          pendingDelete ? (
            <View style={styles.preview}>
              <GoalProgress
                title={pendingDelete.title}
                currentAmount={pendingDelete.currentAmount}
                targetAmount={pendingDelete.targetAmount}
                completed={pendingDelete.completed}
              />
            </View>
          ) : undefined
        }
        confirmLabel="Excluir meta"
        busy={deleting}
        onConfirm={() => void performDelete()}
        onClose={() => setPendingDelete(null)}
      />
    </ScrollScreen>
  );
}

// Everything saved across the goals still in progress.
function SavedSummary({ goals }: { goals: Goal[] }) {
  if (goals.length === 0) return null;
  const saved = goals.reduce((sum, goal) => sum + toCents(goal.currentAmount), 0) / 100;
  const target = goals.reduce((sum, goal) => sum + toCents(goal.targetAmount), 0) / 100;
  const percent = target > 0 ? Math.min(100, (saved / target) * 100) : 0;
  return (
    <Card style={styles.summary}>
      <View style={styles.summaryRow}>
        <View style={styles.flex}>
          <Text variant="subhead" tone="muted">
            Guardado nas metas
          </Text>
          <Text
            variant="numeralLarge"
            accessibilityLabel={`Guardado nas metas: ${spokenMoney(saved)}`}
          >
            {formatMoney(saved)}
          </Text>
        </View>
        <View style={styles.summaryTarget}>
          <Text variant="subhead" tone="muted">
            Objetivo
          </Text>
          <Text variant="numeral">{formatMoney(target)}</Text>
        </View>
      </View>
      <ProgressBar
        percent={percent}
        height={10}
        accessibilityLabel={`${Math.round(percent)}% do total das metas`}
      />
      <Text variant="footnote" tone="muted">
        {Math.round(percent)}% do total · {goals.length} {goals.length === 1 ? "meta" : "metas"} em
        andamento
      </Text>
    </Card>
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
    gap: space.md,
    marginBottom: space["2xl"],
  },
  summaryRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: space.md,
  },
  summaryTarget: {
    alignItems: "flex-end",
  },
  section: {
    gap: space.md,
    marginBottom: space["2xl"],
  },
  list: {
    gap: space.md,
  },
  preview: {
    padding: space.lg,
  },
});
