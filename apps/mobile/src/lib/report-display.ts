import type { Report, ReportCategory, ReportMonth } from "@mony/shared-types";

import { formatDateDisplay, localTodayISO } from "./date-mask";

// Display rules for Relatórios (docs/specs/reports), legacy's where it
// had them.

export type RatioTone = "success" | "warning" | "danger";

const MONTHS_SHORT = [
  "jan",
  "fev",
  "mar",
  "abr",
  "mai",
  "jun",
  "jul",
  "ago",
  "set",
  "out",
  "nov",
  "dez",
];
const MONTHS_LONG = [
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

export const WEEKDAYS_SHORT = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
export const WEEKDAYS_LONG = [
  "Domingo",
  "Segunda-feira",
  "Terça-feira",
  "Quarta-feira",
  "Quinta-feira",
  "Sexta-feira",
  "Sábado",
];

const monthIndex = (month: string) => Number(month.slice(5, 7)) - 1;

// "2026-09" → "set/2026" (legacy's month format, in pt-BR).
export const monthLabel = (month: string): string =>
  `${MONTHS_SHORT[monthIndex(month)]}/${month.slice(0, 4)}`;
// "2026-09" → "set"
export const monthShort = (month: string): string => MONTHS_SHORT[monthIndex(month)] ?? "";
// "2026-09" → "setembro de 2026" (read aloud)
export const monthSpoken = (month: string): string =>
  `${MONTHS_LONG[monthIndex(month)]} de ${month.slice(0, 4)}`;

// 0.724 → "72,4%" (legacy's number_format(…, 1)).
export const percentLabel = (fraction: number): string =>
  `${(fraction * 100).toFixed(1).replace(".", ",")}%`;

// The period summary's bar: legacy's 70% / 90% thresholds and messages.
export function summaryRatio(ratio: number): { tone: RatioTone; message: string } {
  if (ratio <= 0.7) return { tone: "success", message: "Sua situação financeira está controlada!" };
  if (ratio <= 0.9) {
    return {
      tone: "warning",
      message: "Atenção! Suas despesas estão se aproximando do limite saudável.",
    };
  }
  return { tone: "danger", message: "Alerta! Suas despesas estão superando suas receitas." };
}

// The monthly table's bar: legacy uses 80% / 100% there.
export function monthRatio(month: ReportMonth): { ratio: number; tone: RatioTone } {
  const income = Number(month.income);
  const ratio = income > 0 ? Number(month.expensesPaid) / income : 0;
  return { ratio, tone: ratio <= 0.8 ? "success" : ratio <= 1 ? "warning" : "danger" };
}

// "Receitas × despesas por mês" charts the range's last 3 months (legacy).
export const lastThreeMonths = (monthly: ReportMonth[]): ReportMonth[] => monthly.slice(-3);

// Each category's share of the top 5 shown (legacy's pie: the remainder
// isn't part of it).
export function categoryShares(
  categories: ReportCategory[],
): Array<ReportCategory & { share: number }> {
  const total = categories.reduce((sum, category) => sum + Number(category.total), 0);
  return categories.map((category) => ({
    ...category,
    share: total > 0 ? Number(category.total) / total : 0,
  }));
}

// Nothing at all in the range: one empty state instead of six.
export const isEmptyReport = (report: Report): boolean =>
  report.monthly.length === 0 &&
  Number(report.summary.totalIncome) === 0 &&
  Number(report.summary.totalExpensesPaid) === 0;

// The current month in the phone's calendar, as the date fields show it.
export function currentMonthRange(now: Date = new Date()): { from: string; to: string } {
  const today = localTodayISO(now);
  const [year, month] = today.split("-").map(Number);
  const last = new Date(year!, month!, 0).getDate();
  const prefix = today.slice(0, 8);
  return {
    from: formatDateDisplay(`${prefix}01`),
    to: formatDateDisplay(`${prefix}${String(last).padStart(2, "0")}`),
  };
}

// The report's range for the hero chip: "01/07 – 30/09/2026", or both years
// when they differ ("01/12/2025 – 31/01/2026").
export function rangeLabel(dateFrom: string, dateTo: string): string {
  const from = formatDateDisplay(dateFrom);
  const to = formatDateDisplay(dateTo);
  return dateFrom.slice(0, 4) === dateTo.slice(0, 4)
    ? `${from.slice(0, 5)} – ${to}`
    : `${from} – ${to}`;
}
