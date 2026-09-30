import { BadRequestException } from "@nestjs/common";

import {
  addMonthsToDateString,
  endOfMonthDateString,
  startOfMonthDateString,
} from "../common/utils/date.util";

// Pure pieces of the reports (docs/specs/reports), kept apart from the
// queries so they can be unit-tested.

// Both dates or neither; neither = the month `today` is in.
export function resolveRange(
  query: { dateFrom?: string; dateTo?: string },
  today: string,
): [string, string] {
  const { dateFrom, dateTo } = query;
  if (!dateFrom && !dateTo) {
    return [startOfMonthDateString(today), endOfMonthDateString(today)];
  }
  if (!dateFrom || !dateTo) {
    throw new BadRequestException("dateFrom and dateTo must be given together.");
  }
  if (dateFrom > dateTo) {
    throw new BadRequestException("dateFrom must not be after dateTo.");
  }
  return [dateFrom, dateTo];
}

// The trailing-12-months window: 11 months before `today`'s and that one
// ("YYYY-MM" keys, oldest first), from its first day to the current
// month's last — legacy had no upper bound, so future recurring entries
// leaked in as extra months.
export function lastTwelveMonths(today: string): {
  dateFrom: string;
  dateTo: string;
  months: string[];
} {
  const first = startOfMonthDateString(addMonthsToDateString(startOfMonthDateString(today), -11));
  const months = Array.from({ length: 12 }, (_, i) => addMonthsToDateString(first, i).slice(0, 7));
  return { dateFrom: first, dateTo: endOfMonthDateString(today), months };
}

// Sunday (0) … Saturday (6), zero where nothing was spent.
export function fillWeekdays(
  rows: Array<{ weekday: number; total: string }>,
): Array<{ weekday: number; total: string }> {
  const byDay = new Map(rows.map((row) => [row.weekday, row.total]));
  return Array.from({ length: 7 }, (_, weekday) => ({
    weekday,
    total: byDay.get(weekday) ?? "0.00",
  }));
}

// Every month key present, zero where there was nothing.
export function fillMonths<T extends { month: string }>(
  months: string[],
  rows: T[],
  empty: (month: string) => T,
): T[] {
  const byMonth = new Map(rows.map((row) => [row.month, row]));
  return months.map((month) => byMonth.get(month) ?? empty(month));
}

// Expenses as a fraction of income; 0 without income (as the dashboard).
export function expenseRatio(income: number, expensesPaid: number): number {
  return income > 0 ? expensesPaid / income : 0;
}
