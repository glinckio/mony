import { Ionicons } from "@expo/vector-icons";
import { formatCurrency, type DashboardData, type DashboardPeriod } from "@mony/shared-types";
import { color, radius, size as sizeTokens, spacing } from "@mony/ui-tokens";
import { useNavigation } from "@react-navigation/native";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import { BarChart } from "react-native-gifted-charts";

import { AppHeader, Button, ProgressBar, Screen, SegmentedToggle, Text, TextField } from "../../components/ui";
import { apiFetch, logout } from "../../lib/api-client";
import { useAuthStore } from "../../lib/auth-store";
import { formatDateInputDigits, parseDateInputToISO } from "../../lib/date-mask";
import { useRefetchOnFocus } from "../../lib/use-refetch-on-focus";
import type { MainTabNavigation } from "../../navigation/RootNavigator";

const PERIOD_OPTIONS: Array<{ value: DashboardPeriod; label: string }> = [
  { value: "day", label: "Dia" },
  { value: "week", label: "Semana" },
  { value: "month", label: "Mês" },
  { value: "custom", label: "Personalizado" },
];

const MONTH_LABELS = [
  "Jan",
  "Fev",
  "Mar",
  "Abr",
  "Mai",
  "Jun",
  "Jul",
  "Ago",
  "Set",
  "Out",
  "Nov",
  "Dez",
];

export function DashboardScreen() {
  const navigation = useNavigation<MainTabNavigation>();
  const user = useAuthStore((state) => state.user);
  const [loggingOut, setLoggingOut] = useState(false);
  const [period, setPeriod] = useState<DashboardPeriod>("month");
  const [customDateFromDisplay, setCustomDateFromDisplay] = useState("");
  const [customDateToDisplay, setCustomDateToDisplay] = useState("");

  const customDateFrom = parseDateInputToISO(customDateFromDisplay);
  const customDateTo = parseDateInputToISO(customDateToDisplay);
  const customRangeReady = period !== "custom" || (!!customDateFrom && !!customDateTo);

  const queryParams = new URLSearchParams({ period });
  if (period === "custom" && customRangeReady) {
    queryParams.set("dateFrom", customDateFrom);
    queryParams.set("dateTo", customDateTo);
  }

  const {
    data,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ["dashboard", period, customDateFrom, customDateTo],
    queryFn: () => apiFetch<DashboardData>(`/dashboard?${queryParams.toString()}`),
    enabled: customRangeReady,
  });
  useRefetchOnFocus(refetch);

  const handleLogout = async () => {
    setLoggingOut(true);
    await logout();
  };

  return (
    <Screen>
      <AppHeader title="Início" />

      <Text variant="body" color={color.textSecondary}>
        Bem-vindo, {user?.name}
      </Text>

      <SegmentedToggle
        testID="dashboard-period-toggle"
        options={PERIOD_OPTIONS}
        value={period}
        onChange={setPeriod}
      />

      {period === "custom" && (
        <View style={styles.customRange}>
          <View style={styles.customRangeField}>
            <TextField
              testID="dashboard-date-from"
              label="De"
              placeholder="DD/MM/AAAA"
              keyboardType="number-pad"
              value={customDateFromDisplay}
              onChangeText={(text) => setCustomDateFromDisplay(formatDateInputDigits(text))}
              maxLength={10}
            />
          </View>
          <View style={styles.customRangeField}>
            <TextField
              testID="dashboard-date-to"
              label="Até"
              placeholder="DD/MM/AAAA"
              keyboardType="number-pad"
              value={customDateToDisplay}
              onChangeText={(text) => setCustomDateToDisplay(formatDateInputDigits(text))}
              maxLength={10}
            />
          </View>
        </View>
      )}

      {isLoading ? (
        <Text variant="caption">Carregando...</Text>
      ) : isError ? (
        <Text variant="caption" color={color.danger}>
          Algo deu errado. Tente novamente.
        </Text>
      ) : data ? (
        <DashboardContent data={data} onGoalPress={() => navigation.navigate("Goals")} />
      ) : null}

      <View style={styles.logoutButton}>
        <Button testID="logout-button" label="Sair" variant="secondary" loading={loggingOut} onPress={handleLogout} />
      </View>
    </Screen>
  );
}

interface DashboardContentProps {
  data: DashboardData;
  onGoalPress: () => void;
}

function DashboardContent({ data, onGoalPress }: DashboardContentProps) {
  const navigation = useNavigation<MainTabNavigation>();
  const { summary, previousPeriodIncomeChangePercent, averageDailyExpense, incompleteGoals, yearlyBreakdown } = data;
  const balanceIsNegative = Number(summary.balance) < 0;

  return (
    <View style={styles.content}>
      <View style={styles.summaryCard} testID="dashboard-summary-card">
        <Text variant="caption" color={color.textSecondary}>
          Saldo
        </Text>
        <Text variant="display" color={balanceIsNegative ? color.danger : color.success}>
          {formatCurrency(summary.balance)}
        </Text>

        <View style={styles.summaryRow}>
          <SummaryFigure label="Receitas" value={formatCurrency(summary.totalIncome)} color={color.success} />
          <SummaryFigure label="Despesas pagas" value={formatCurrency(summary.totalExpensesPaid)} color={color.danger} />
        </View>
        <View style={styles.summaryRow}>
          <SummaryFigure
            label="Despesas pendentes"
            value={formatCurrency(summary.totalExpensesPending)}
            color={color.warning}
          />
          <SummaryFigure
            label="% da renda comprometida"
            value={`${Math.round(summary.expenseRatio * 100)}%`}
            color={color.textPrimary}
          />
        </View>

        {previousPeriodIncomeChangePercent !== null && (
          <View style={styles.comparisonBadge} testID="dashboard-comparison-badge">
            <Ionicons
              name={previousPeriodIncomeChangePercent >= 0 ? "arrow-up" : "arrow-down"}
              size={sizeTokens.iconSm}
              color={previousPeriodIncomeChangePercent >= 0 ? color.success : color.danger}
            />
            <Text
              variant="caption"
              color={previousPeriodIncomeChangePercent >= 0 ? color.success : color.danger}
            >
              {Math.abs(previousPeriodIncomeChangePercent).toFixed(1)}% de receita vs. período anterior
            </Text>
          </View>
        )}

        <Text variant="caption" color={color.textSecondary} style={styles.averageDaily}>
          Média diária de despesas: {formatCurrency(averageDailyExpense)}
        </Text>
      </View>

      <View style={styles.sectionHeader}>
        <Text variant="bodyStrong">Metas</Text>
        <TouchableOpacity testID="dashboard-see-all-goals" onPress={() => navigation.navigate("Goals")}>
          <Text variant="caption" color={color.primary}>
            Ver todas
          </Text>
        </TouchableOpacity>
      </View>

      {incompleteGoals.length === 0 ? (
        <Text variant="caption" color={color.textSecondary}>
          Nenhuma meta em andamento.
        </Text>
      ) : (
        <View style={styles.goalsList}>
          {incompleteGoals.map((goal) => {
            const progressPercent = Math.min(
              100,
              Math.max(0, (Number(goal.currentAmount) / Number(goal.targetAmount || "1")) * 100),
            );
            return (
              <TouchableOpacity
                key={goal.id}
                testID={`dashboard-goal-${goal.id}`}
                style={styles.goalRow}
                onPress={onGoalPress}
              >
                <Text variant="bodyStrong">{goal.title}</Text>
                <ProgressBar percent={progressPercent} />
                <Text variant="caption" color={color.textSecondary}>
                  {formatCurrency(goal.currentAmount)} de {formatCurrency(goal.targetAmount)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      <Text variant="bodyStrong">Receitas x despesas no ano</Text>
      <YearlyChart data={yearlyBreakdown} />
    </View>
  );
}

interface SummaryFigureProps {
  label: string;
  value: string;
  color: string;
}

function SummaryFigure({ label, value, color: valueColor }: SummaryFigureProps) {
  return (
    <View style={styles.summaryFigure}>
      <Text variant="caption" color={color.textSecondary}>
        {label}
      </Text>
      <Text variant="bodyStrong" color={valueColor}>
        {value}
      </Text>
    </View>
  );
}

interface YearlyChartProps {
  data: DashboardData["yearlyBreakdown"];
}

function YearlyChart({ data }: YearlyChartProps) {
  const barData = data.flatMap((month) => [
    {
      value: Number(month.income),
      label: MONTH_LABELS[month.month - 1],
      frontColor: color.success,
      spacing: 2,
    },
    {
      value: Number(month.expensesPaid),
      frontColor: color.danger,
    },
  ]);

  return (
    <View testID="dashboard-yearly-chart">
      <BarChart
        data={barData}
        barWidth={6}
        spacing={14}
        height={160}
        hideRules
        yAxisThickness={0}
        xAxisThickness={1}
        xAxisColor={color.border}
        noOfSections={3}
        labelWidth={24}
        xAxisLabelTextStyle={{ color: color.textSecondary, fontSize: 10 }}
        isAnimated={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  customRange: {
    flexDirection: "row",
    gap: spacing.md,
  },
  customRangeField: {
    flex: 1,
  },
  content: {
    gap: spacing.lg,
  },
  summaryCard: {
    backgroundColor: color.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: color.border,
    padding: spacing.md,
    gap: spacing.sm,
  },
  summaryRow: {
    flexDirection: "row",
    gap: spacing.md,
  },
  summaryFigure: {
    flex: 1,
    gap: spacing.xxs,
  },
  comparisonBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xxs,
  },
  averageDaily: {
    marginTop: spacing.xxs,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  goalsList: {
    gap: spacing.sm,
  },
  goalRow: {
    gap: spacing.xs,
    padding: spacing.md,
    backgroundColor: color.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: color.border,
  },
  logoutButton: {
    marginTop: spacing.lg,
  },
});
