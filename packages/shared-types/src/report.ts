import { z } from "zod";

import { isCalendarDate } from "./date";

// Reports (docs/specs/reports): legacy's "Relatórios Financeiros" over a
// date range, for the active workspace. Expenses are paid ones only.

const calendarDate = z.string().refine(isCalendarDate, "Data inválida.");

// Both dates or neither (neither = the current month).
export const reportQuerySchema = z
  .object({
    dateFrom: calendarDate.optional(),
    dateTo: calendarDate.optional(),
  })
  .refine((query) => (query.dateFrom === undefined) === (query.dateTo === undefined), {
    message: "Informe as duas datas.",
    path: ["dateTo"],
  })
  .refine((query) => !query.dateFrom || !query.dateTo || query.dateFrom <= query.dateTo, {
    message: "A data final precisa ser depois da inicial.",
    path: ["dateTo"],
  });
export type ReportQuery = z.infer<typeof reportQuerySchema>;

export const reportSummarySchema = z.object({
  totalIncome: z.string(),
  totalExpensesPaid: z.string(),
  balance: z.string(),
  // expenses / income (0 when there's no income): 0.72 = 72%.
  expenseRatio: z.number(),
});

export const reportMonthSchema = z.object({
  // "YYYY-MM"
  month: z.string(),
  income: z.string(),
  expensesPaid: z.string(),
  balance: z.string(),
});

export const reportCategorySchema = z.object({
  categoryId: z.string(),
  name: z.string(),
  color: z.string(),
  icon: z.string(),
  total: z.string(),
});

export const reportWeekdaySchema = z.object({
  // 0 = Sunday … 6 = Saturday
  weekday: z.number().int().min(0).max(6),
  total: z.string(),
});

export const reportTrendMonthSchema = z.object({
  month: z.string(),
  income: z.string(),
  expensesPaid: z.string(),
});

export const reportSchema = z.object({
  dateFrom: z.string(),
  dateTo: z.string(),
  summary: reportSummarySchema,
  monthly: z.array(reportMonthSchema),
  topExpenseCategories: z.array(reportCategorySchema),
  topIncomeCategories: z.array(reportCategorySchema),
  expensesByWeekday: z.array(reportWeekdaySchema),
  last12Months: z.array(reportTrendMonthSchema),
});

export type Report = z.infer<typeof reportSchema>;
export type ReportMonth = z.infer<typeof reportMonthSchema>;
export type ReportCategory = z.infer<typeof reportCategorySchema>;
export type ReportWeekday = z.infer<typeof reportWeekdaySchema>;
export type ReportTrendMonth = z.infer<typeof reportTrendMonthSchema>;

// Legacy's top-N cut for the category charts.
export const REPORT_TOP_CATEGORIES = 5;
