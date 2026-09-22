import { Ionicons } from "@expo/vector-icons";
import { formatCurrency, type Goal } from "@mony/shared-types";
import { color, radius, size as sizeTokens, spacing } from "@mony/ui-tokens";
import { useNavigation } from "@react-navigation/native";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Alert, StyleSheet, TouchableOpacity, View } from "react-native";

import { AppHeader, ProgressBar, Screen, Text } from "../../components/ui";
import { apiFetch } from "../../lib/api-client";
import { useRefetchOnFocus } from "../../lib/use-refetch-on-focus";
import type { MainTabNavigation } from "../../navigation/RootNavigator";

export function GoalsScreen() {
  const navigation = useNavigation<MainTabNavigation>();
  const queryClient = useQueryClient();

  const {
    data: goals,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ["goals"],
    queryFn: () => apiFetch<Goal[]>("/goals"),
  });
  useRefetchOnFocus(refetch);

  const handleDelete = (goal: Goal) => {
    Alert.alert("Excluir meta", `Excluir "${goal.title}"?`, [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Excluir",
        style: "destructive",
        onPress: async () => {
          try {
            await apiFetch(`/goals/${goal.id}`, { method: "DELETE" });
            await queryClient.invalidateQueries({ queryKey: ["goals"] });
          } catch {
            Alert.alert("Erro", "Não foi possível excluir. Tente novamente.");
          }
        },
      },
    ]);
  };

  const inProgress = (goals ?? []).filter((goal) => !goal.completed);
  const completed = (goals ?? []).filter((goal) => goal.completed);

  return (
    <Screen>
      <AppHeader
        title="Metas"
        rightAccessory={
          <TouchableOpacity
            testID="add-goal-button"
            accessibilityRole="button"
            hitSlop={8}
            onPress={() => navigation.navigate("GoalForm", undefined)}
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
      ) : (goals ?? []).length === 0 ? (
        <Text variant="caption" color={color.textSecondary}>
          Nenhuma meta ainda.
        </Text>
      ) : (
        <View style={styles.list}>
          {inProgress.map((goal) => (
            <GoalRow
              key={goal.id}
              goal={goal}
              onPress={() => navigation.navigate("GoalForm", { goal })}
              onDelete={() => handleDelete(goal)}
            />
          ))}
          {completed.length > 0 && (
            <>
              <Text variant="bodyStrong" style={styles.sectionTitle}>
                Concluídas
              </Text>
              {completed.map((goal) => (
                <GoalRow
                  key={goal.id}
                  goal={goal}
                  onPress={() => navigation.navigate("GoalForm", { goal })}
                  onDelete={() => handleDelete(goal)}
                />
              ))}
            </>
          )}
        </View>
      )}
    </Screen>
  );
}

interface GoalRowProps {
  goal: Goal;
  onPress: () => void;
  onDelete: () => void;
}

function GoalRow({ goal, onPress, onDelete }: GoalRowProps) {
  const isOverdue = !goal.completed && !!goal.targetDate && goal.targetDate < todayISODate();

  return (
    <TouchableOpacity testID={`goal-row-${goal.id}`} style={styles.row} onPress={onPress}>
      <View style={styles.rowHeader}>
        <Text variant="bodyStrong" style={styles.rowTitle}>
          {goal.title}
        </Text>
        {isOverdue && (
          <View style={styles.overdueBadge} testID={`overdue-badge-${goal.id}`}>
            <Text variant="caption" color={color.danger}>
              Atrasada
            </Text>
          </View>
        )}
        <TouchableOpacity
          testID={`delete-goal-${goal.id}`}
          accessibilityRole="button"
          accessibilityLabel="Excluir meta"
          hitSlop={8}
          onPress={onDelete}
        >
          <Ionicons name="trash-outline" size={sizeTokens.iconSm} color={color.danger} />
        </TouchableOpacity>
      </View>
      <ProgressBar testID={`goal-progress-${goal.id}`} percent={goal.progressPercent} />
      <Text variant="caption" color={color.textSecondary}>
        {formatCurrency(goal.currentAmount)} de {formatCurrency(goal.targetAmount)} (
        {Math.round(goal.progressPercent)}%)
      </Text>
    </TouchableOpacity>
  );
}

// Compares against the DTO's own date-only ISO string format
// ("YYYY-MM-DD"), so no Date object / local-timezone parsing involved.
function todayISODate(): string {
  return new Date().toISOString().slice(0, 10);
}

const styles = StyleSheet.create({
  list: {
    gap: spacing.md,
  },
  sectionTitle: {
    marginTop: spacing.md,
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
  overdueBadge: {
    backgroundColor: color.dangerMuted,
    borderRadius: radius.sm,
    paddingVertical: spacing.xxs,
    paddingHorizontal: spacing.sm,
  },
});
