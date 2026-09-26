import type { DashboardData, DashboardPeriod } from "@mony/shared-types";
import { useNavigation } from "@react-navigation/native";
import { useQuery } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { StyleSheet, View } from "react-native";

import {
  BalanceHero,
  GoalProgress,
  Initials,
  NotebookSwitch,
  PeriodSummary,
  YearChart,
  type BalanceHeroState,
} from "../../components/domain";
import {
  Card,
  EmptyState,
  ScrollScreen,
  SegmentedControl,
  Skeleton,
  Text,
  TextField,
  Touchable,
} from "../../components/ui";
import { apiFetch } from "../../lib/api-client";
import { useAuthStore } from "../../lib/auth-store";
import { formatDateInputDigits, parseDateInputToISO } from "../../lib/date-mask";
import { useRefetchOnFocus } from "../../lib/use-refetch-on-focus";
import type { MainTabNavigation } from "../../navigation/RootNavigator";
import { space, useTheme } from "../../theme";

const PERIOD_OPTIONS: Array<{ value: DashboardPeriod; label: string }> = [
  { value: "day", label: "Dia" },
  { value: "week", label: "Semana" },
  { value: "month", label: "Mês" },
  { value: "custom", label: "Período" },
];

const MONTHS = [
  "janeiro",
  "fevereiro",
  "março",
  "abril",
  "maio",
  "junho",
  "julho",
  "agosto",
  "setembro",
  "outubro",
  "novembro",
  "dezembro",
];

// How far the first card rides over the hero's rounded bottom edge.
const HERO_OVERLAP = 36;

// "de setembro", "de hoje"… and the matching previous-period wording.
function periodWording(period: DashboardPeriod, from: string, to: string, today = new Date()) {
  const month = MONTHS[today.getMonth()] ?? "";
  const previousMonth = MONTHS[(today.getMonth() + 11) % 12] ?? "";
  switch (period) {
    case "day":
      return { label: "de hoje", comparison: "vs. ontem" };
    case "week":
      return { label: "da semana", comparison: "vs. semana passada" };
    case "custom":
      return {
        label: `de ${from.slice(0, 5)} a ${to.slice(0, 5)}`,
        comparison: "vs. período anterior",
      };
    default:
      return { label: `de ${month}`, comparison: `vs. ${previousMonth}` };
  }
}

function greeting(now = new Date()): string {
  const hour = now.getHours();
  if (hour < 12) return "Bom dia,";
  if (hour < 18) return "Boa tarde,";
  return "Boa noite,";
}

// Início — the key screen (design/telas.md §1): the gradient hero with the
// period's balance, the figures behind it on a card riding over the hero's
// edge, then goals and the year chart, each on its own white card.
export function DashboardScreen() {
  const navigation = useNavigation<MainTabNavigation>();
  const { colors } = useTheme();
  const user = useAuthStore((state) => state.user);
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

  const { data, isLoading, isError, isRefetching, refetch } = useQuery({
    queryKey: ["dashboard", period, customDateFrom, customDateTo],
    queryFn: () => apiFetch<DashboardData>(`/dashboard?${queryParams.toString()}`),
    enabled: customRangeReady,
  });
  useRefetchOnFocus(refetch);

  const wording = periodWording(period, customDateFromDisplay, customDateToDisplay);
  const loading = customRangeReady && (isLoading || (!data && !isError));
  const heroState: BalanceHeroState = !customRangeReady
    ? { kind: "pickDates" }
    : loading
      ? { kind: "loading" }
      : isError || !data
        ? { kind: "error", onRetry: () => void refetch() }
        : { kind: "ready", data, periodLabel: wording.label, comparisonLabel: wording.comparison };

  return (
    <ScrollScreen
      testID="dashboard-screen"
      title="Início"
      heroOverlap={HERO_OVERLAP}
      hero={
        <BalanceHero
          eyebrow={greeting()}
          name={user?.name?.trim() || "Olá!"}
          overlap={HERO_OVERLAP}
          avatar={
            <Initials
              testID="go-to-profile"
              name={user?.name}
              size={48}
              variant="glass"
              onPress={() => navigation.navigate("Profile")}
            />
          }
          periodControl={
            <SegmentedControl
              testID="dashboard-period-toggle"
              variant="glass"
              accessibilityLabel="Período"
              options={PERIOD_OPTIONS}
              value={period}
              onChange={setPeriod}
            />
          }
          notebookSwitch={<NotebookSwitch variant="glass" />}
          state={heroState}
        />
      }
      refreshing={isRefetching}
      onRefresh={customRangeReady ? () => void refetch() : undefined}
      // Always on (not just for "Período"): toggling it would remount the
      // scroll view — hero included — and reset the scroll.
      keyboardAware
    >
      {period === "custom" ? (
        <Card style={styles.block}>
          <View style={styles.customRange}>
            <TextField
              testID="dashboard-date-from"
              label="De"
              placeholder="DD/MM/AAAA"
              keyboardType="number-pad"
              value={customDateFromDisplay}
              onChangeText={(text) => setCustomDateFromDisplay(formatDateInputDigits(text))}
              maxLength={10}
              containerStyle={styles.flex}
            />
            <TextField
              testID="dashboard-date-to"
              label="Até"
              placeholder="DD/MM/AAAA"
              keyboardType="number-pad"
              value={customDateToDisplay}
              onChangeText={(text) => setCustomDateToDisplay(formatDateInputDigits(text))}
              maxLength={10}
              containerStyle={styles.flex}
            />
          </View>
        </Card>
      ) : null}

      {loading ? (
        <View style={styles.block}>
          <Skeleton height={300} radius="lg" />
        </View>
      ) : data && customRangeReady && !isError ? (
        <>
          <View style={styles.block}>
            <PeriodSummary data={data} />
          </View>

          <Section
            title="Metas"
            action={
              <Touchable
                testID="dashboard-see-all-goals"
                feedback="fade"
                accessibilityRole="link"
                accessibilityLabel="Ver todas as metas"
                onPress={() => navigation.navigate("Goals")}
                hitSlop={12}
              >
                <Text variant="subhead" tone="primary">
                  Ver todas
                </Text>
              </Touchable>
            }
          >
            {data.incompleteGoals.length === 0 ? (
              <Card>
                <EmptyState
                  compact
                  title="Nenhuma meta em andamento."
                  message="Toda economia começa com um número."
                  action={{
                    label: "Criar meta",
                    onPress: () => navigation.navigate("GoalForm", undefined),
                  }}
                />
              </Card>
            ) : (
              <Card padded={false}>
                {data.incompleteGoals.map((goal, index) => (
                  <Touchable
                    key={goal.id}
                    testID={`dashboard-goal-${goal.id}`}
                    feedback="row"
                    accessibilityRole="button"
                    onPress={() => navigation.navigate("Goals")}
                    style={[
                      styles.goal,
                      index > 0 && [styles.goalDivider, { borderTopColor: colors.border }],
                    ]}
                  >
                    <GoalProgress
                      index={index}
                      title={goal.title}
                      currentAmount={goal.currentAmount}
                      targetAmount={goal.targetAmount}
                    />
                  </Touchable>
                ))}
              </Card>
            )}
          </Section>

          <Section title={`Receitas × despesas em ${new Date().getFullYear()}`}>
            <Card>
              <YearChart data={data.yearlyBreakdown} />
            </Card>
          </Section>
        </>
      ) : null}
    </ScrollScreen>
  );
}

function Section({
  title,
  action,
  children,
}: {
  title: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text variant="title2" accessibilityRole="header" style={styles.flex}>
          {title}
        </Text>
        {action}
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  block: {
    marginBottom: space["2xl"],
  },
  customRange: {
    flexDirection: "row",
    gap: space.md,
  },
  section: {
    gap: space.md,
    marginBottom: space["2xl"],
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
  },
  goal: {
    paddingHorizontal: space.lg,
    paddingVertical: space.lg,
  },
  goalDivider: {
    borderTopWidth: StyleSheet.hairlineWidth * 2,
  },
});
