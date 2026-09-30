import {
  REPORT_TOP_CATEGORIES,
  isCalendarDate,
  reportQuerySchema,
  type Report,
  type WorkspaceType,
} from "@mony/shared-types";
import { useNavigation } from "@react-navigation/native";
import { useQuery } from "@tanstack/react-query";
import { memo, useMemo, useState, type ReactNode } from "react";
import { StyleSheet, View } from "react-native";

import {
  CategoryDonut,
  ColumnChart,
  ReportHero,
  ReportMonthRow,
  TrendChart,
} from "../../components/domain";
import {
  Card,
  EmptyState,
  ErrorState,
  Rule,
  ScrollScreen,
  Skeleton,
  Text,
  TextField,
} from "../../components/ui";
import { apiFetch } from "../../lib/api-client";
import { formatDateInputDigits, parseDateInputToISO } from "../../lib/date-mask";
import { formatMoney, formatSigned, spokenMoney } from "../../lib/money-display";
import {
  WEEKDAYS_LONG,
  WEEKDAYS_SHORT,
  currentMonthRange,
  isEmptyReport,
  lastThreeMonths,
  monthLabel,
  monthShort,
  monthSpoken,
  percentLabel,
  rangeLabel,
} from "../../lib/report-display";
import { useRefetchOnFocus } from "../../lib/use-refetch-on-focus";
import { useWorkspaceStore } from "../../lib/workspace-store";
import type { AppStackNavigation } from "../../navigation/RootNavigator";
import { space, useTheme } from "../../theme";

// Rows past this one grow their bars together (a long range would stagger
// them for seconds, off screen).
const MAX_STAGGER = 8;

const NOTEBOOK: Record<WorkspaceType, string> = { PERSONAL: "Pessoal", BUSINESS: "Empresa" };
const notebookOf = (workspace: WorkspaceType | null) => NOTEBOOK[workspace ?? "PERSONAL"];

// "DD/MM/AAAA" → "YYYY-MM-DD" when it's a real date, "" otherwise.
const validDate = (text: string) => {
  const iso = parseDateInputToISO(text);
  return iso && isCalendarDate(iso) ? iso : "";
};

// Relatórios (design/telas.md §29, docs/specs/reports): legacy's report
// for a period of the active notebook — the summary as the hero, then
// income × expenses per month, the 12-month evolution, the top
// categories, expenses by weekday and the monthly table.
export function ReportsScreen() {
  const navigation = useNavigation<AppStackNavigation>();
  const { colors, gradients } = useTheme();
  const workspace = useWorkspaceStore((state) => state.activeWorkspace);
  const [initial] = useState(currentMonthRange);
  const [fromText, setFromText] = useState(initial.from);
  const [toText, setToText] = useState(initial.to);

  const dateFrom = validDate(fromText);
  const dateTo = validDate(toText);
  // The shared rules (both dates, in order) and their pt-BR copy.
  const range = reportQuerySchema.safeParse({ dateFrom, dateTo });
  const bothDates = !!dateFrom && !!dateTo;
  const ready = bothDates && range.success;
  const rangeError = bothDates && !range.success ? range.error.issues[0]?.message : undefined;

  const report = useQuery({
    queryKey: ["reports", workspace, dateFrom, dateTo],
    queryFn: () =>
      apiFetch<Report>(`/reports?${new URLSearchParams({ dateFrom, dateTo }).toString()}`),
    enabled: ready,
    // New entries invalidate ["reports"] (transaction/debt screens).
    staleTime: 5 * 60_000,
    // Typing a new date keeps the last report on screen (dimmed) until the
    // new one lands — but never another notebook's figures under this
    // one's label.
    placeholderData: (previous, previousQuery) =>
      previousQuery?.queryKey[1] === workspace ? previous : undefined,
  });
  useRefetchOnFocus(() => {
    // refetch() ignores `enabled` and `staleTime`: both checked here.
    if (ready && report.isStale) void report.refetch();
  });

  const fieldError = (text: string, valid: string) =>
    text.length === 10 && !valid ? "Data inválida." : undefined;
  const data = report.data;
  // The shown report doesn't match the fields (yet): an incomplete date, or
  // the new range still loading.
  const stale = !ready || report.isPlaceholderData;

  const income = useMemo(
    () => ({ name: "Receitas", gradient: gradients.income, color: colors.success }),
    [gradients, colors],
  );
  const expenses = useMemo(
    () => ({ name: "Despesas pagas", gradient: gradients.brand, color: colors.primary }),
    [gradients, colors],
  );

  return (
    <ScrollScreen
      title="Relatórios"
      onBack={() => navigation.goBack()}
      keyboardAware
      refreshing={report.isRefetching && !report.isPlaceholderData}
      onRefresh={ready ? () => void report.refetch() : undefined}
    >
      <View style={styles.stack}>
        <Card style={styles.period}>
          <View style={styles.fields}>
            <TextField
              testID="reports-date-from"
              label="De"
              placeholder="DD/MM/AAAA"
              keyboardType="number-pad"
              value={fromText}
              onChangeText={(text) => setFromText(formatDateInputDigits(text))}
              maxLength={10}
              error={fieldError(fromText, dateFrom)}
              containerStyle={styles.flex}
            />
            <TextField
              testID="reports-date-to"
              label="Até"
              placeholder="DD/MM/AAAA"
              keyboardType="number-pad"
              value={toText}
              onChangeText={(text) => setToText(formatDateInputDigits(text))}
              maxLength={10}
              error={rangeError ?? fieldError(toText, dateTo)}
              containerStyle={styles.flex}
            />
          </View>
        </Card>

        {data ? (
          <View style={[styles.stack, stale && styles.stale]}>
            <ReportSections
              report={data}
              periodLabel={`${rangeLabel(data.dateFrom, data.dateTo)} · ${notebookOf(workspace)}`}
              income={income}
              expenses={expenses}
            />
          </View>
        ) : !ready ? null : report.isError ? (
          <ErrorState onRetry={() => void report.refetch()} />
        ) : (
          <View style={styles.stack}>
            <Skeleton height={300} radius="xl" />
            <Skeleton height={220} radius="lg" />
          </View>
        )}
      </View>
    </ScrollScreen>
  );
}

type Series = { name: string; gradient: readonly [string, string]; color: string };

// Legacy's cut is the 5 largest; with fewer, the center is simply the total.
const topLabel = (count: number) =>
  count >= REPORT_TOP_CATEGORIES ? `${REPORT_TOP_CATEGORIES} maiores` : "Total";

// Memoized: the fetch states around it (placeholder, refetching) don't
// re-render the charts and the monthly rows.
const ReportSections = memo(function ReportSections({
  report,
  periodLabel,
  income,
  expenses,
}: {
  report: Report;
  periodLabel: string;
  income: Series;
  expenses: Series;
}) {
  // A new range remounts the charts, so each one's default selection (the
  // last month, the busiest weekday) follows the new data.
  const rangeKey = `${report.dateFrom}:${report.dateTo}`;
  const empty = isEmptyReport(report);
  const recent = lastThreeMonths(report.monthly);
  const weekTotal = report.expensesByWeekday.reduce((sum, day) => sum + Number(day.total), 0);
  const busiestDay = report.expensesByWeekday.reduce(
    (best, day) => (Number(day.total) > Number(best.total) ? day : best),
    report.expensesByWeekday[0]!,
  );
  const trendEmpty = report.last12Months.every(
    (month) => Number(month.income) === 0 && Number(month.expensesPaid) === 0,
  );

  const evolution = (
    <Section title="Evolução anual">
      <Card>
        {trendEmpty ? (
          <Text variant="callout" tone="muted">
            Nada lançado nos últimos 12 meses.
          </Text>
        ) : (
          <TrendChart
            testID="reports-trend"
            series={[
              { name: income.name, color: income.color, fill: true },
              { name: expenses.name, color: expenses.color },
            ]}
            points={report.last12Months.map((month) => ({
              key: month.month,
              label: monthShort(month.month),
              values: [Number(month.income), Number(month.expensesPaid)],
              spoken: `${monthSpoken(month.month)}: receitas ${spokenMoney(month.income)}, despesas ${spokenMoney(month.expensesPaid)}`,
            }))}
            renderDetail={(point) => {
              const month = report.last12Months.find((item) => item.month === point.key)!;
              return (
                <Figures
                  label={monthLabel(month.month)}
                  income={month.income}
                  expenses={month.expensesPaid}
                />
              );
            }}
          />
        )}
      </Card>
    </Section>
  );

  if (empty) {
    return (
      <>
        <EmptyState
          testID="reports-empty"
          icon="stats-chart-outline"
          title="Nada lançado nesse período"
          message="Escolha outras datas ou registre um lançamento para ver os relatórios."
        />
        {trendEmpty ? null : evolution}
      </>
    );
  }

  return (
    <>
      <ReportHero testID="reports-summary" summary={report.summary} periodLabel={periodLabel} />

      <Section title="Receitas × despesas por mês">
        <Card>
          <ColumnChart
            key={rangeKey}
            testID="reports-months"
            series={[income, expenses]}
            barWidth={14}
            columns={recent.map((month) => ({
              key: month.month,
              label: monthLabel(month.month),
              values: [Number(month.income), Number(month.expensesPaid)],
              caption: (
                <Text variant="caption" tone={Number(month.balance) < 0 ? "danger" : "muted"}>
                  {formatMoney(month.balance)}
                </Text>
              ),
              spoken: `${monthSpoken(month.month)}: receitas ${spokenMoney(month.income)}, despesas ${spokenMoney(month.expensesPaid)}, saldo ${spokenMoney(month.balance)}`,
            }))}
            renderDetail={(column) => {
              const month = recent.find((item) => item.month === column.key)!;
              return (
                <Figures
                  label={monthLabel(month.month)}
                  income={month.income}
                  expenses={month.expensesPaid}
                />
              );
            }}
          />
        </Card>
      </Section>

      {evolution}

      <Section title="Despesas por categoria">
        <Card>
          {report.topExpenseCategories.length > 0 ? (
            <CategoryDonut
              testID="reports-expense-categories"
              categories={report.topExpenseCategories}
              centerLabel={topLabel(report.topExpenseCategories.length)}
            />
          ) : (
            <Text variant="callout" tone="muted">
              Nenhuma despesa paga no período.
            </Text>
          )}
        </Card>
      </Section>

      <Section title="Receitas por categoria">
        <Card>
          {report.topIncomeCategories.length > 0 ? (
            <CategoryDonut
              testID="reports-income-categories"
              categories={report.topIncomeCategories}
              centerLabel={topLabel(report.topIncomeCategories.length)}
            />
          ) : (
            <Text variant="callout" tone="muted">
              Nenhuma receita no período.
            </Text>
          )}
        </Card>
      </Section>

      <Section title="Despesas por dia da semana">
        <Card>
          {weekTotal > 0 ? (
            <ColumnChart
              key={rangeKey}
              testID="reports-weekdays"
              series={[expenses]}
              barWidth={14}
              initialKey={String(busiestDay.weekday)}
              columns={report.expensesByWeekday.map((day) => ({
                key: String(day.weekday),
                label: WEEKDAYS_SHORT[day.weekday]!,
                values: [Number(day.total)],
                spoken: `${WEEKDAYS_LONG[day.weekday]}: ${spokenMoney(day.total)}`,
              }))}
              renderDetail={(column) => {
                const day = report.expensesByWeekday.find(
                  (item) => String(item.weekday) === column.key,
                )!;
                return (
                  <>
                    <Text variant="subhead" style={styles.flex}>
                      {WEEKDAYS_LONG[day.weekday]}
                    </Text>
                    <Text variant="subhead" tone="danger" style={styles.tabular}>
                      {formatSigned(day.total, "out")}
                    </Text>
                    <Text variant="subhead" tone="muted" style={styles.tabular}>
                      {percentLabel(Number(day.total) / weekTotal)}
                    </Text>
                  </>
                );
              }}
            />
          ) : (
            <Text variant="callout" tone="muted">
              Nenhuma despesa paga no período.
            </Text>
          )}
        </Card>
      </Section>

      <Section title="Resumo mensal">
        <Card testID="reports-monthly">
          {/* The rows' own padding would double the card's at the ends. */}
          <View style={styles.rows}>
            {report.monthly.map((month, index) => (
              <View key={month.month}>
                {index > 0 ? <Rule /> : null}
                <ReportMonthRow month={month} index={Math.min(index, MAX_STAGGER)} />
              </View>
            ))}
          </View>
        </Card>
      </Section>
    </>
  );
});

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={styles.section}>
      <Text variant="title3" accessibilityRole="header">
        {title}
      </Text>
      {children}
    </View>
  );
}

// A month's figures above a chart: the month, + income, − paid expenses.
function Figures({ label, income, expenses }: { label: string; income: string; expenses: string }) {
  return (
    <>
      <Text variant="subhead" style={styles.flex}>
        {label}
      </Text>
      <Text variant="subhead" tone="success" style={styles.tabular}>
        {formatSigned(income, "in")}
      </Text>
      <Text variant="subhead" tone="danger" style={styles.tabular}>
        {formatSigned(expenses, "out")}
      </Text>
    </>
  );
}

const styles = StyleSheet.create({
  // Sections sit clearly further apart than the pieces inside them.
  stack: {
    gap: space["2xl"],
  },
  section: {
    gap: space.md,
  },
  period: {
    gap: space.sm,
  },
  rows: {
    marginVertical: -space.md,
  },
  stale: {
    opacity: 0.5,
  },
  fields: {
    flexDirection: "row",
    gap: space.md,
  },
  flex: {
    flex: 1,
  },
  tabular: {
    fontVariant: ["tabular-nums"],
  },
});
