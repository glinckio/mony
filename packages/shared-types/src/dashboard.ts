import { z } from "zod";

export const dashboardPeriodSchema = z.enum(["day", "week", "month", "custom"]);
export type DashboardPeriod = z.infer<typeof dashboardPeriodSchema>;

export const dashboardSummarySchema = z.object({
  totalIncome: z.string(),
  totalExpensesPaid: z.string(),
  totalExpensesPending: z.string(),
  balance: z.string(),
  expenseRatio: z.number(),
});

export const dashboardGoalPreviewSchema = z.object({
  id: z.string(),
  title: z.string(),
  targetAmount: z.string(),
  currentAmount: z.string(),
  targetDate: z.string().nullable(),
});

export const dashboardYearlyMonthSchema = z.object({
  month: z.number(),
  income: z.string(),
  expensesPaid: z.string(),
});

export const dashboardDataSchema = z.object({
  summary: dashboardSummarySchema,
  previousPeriodIncomeChangePercent: z.number().nullable(),
  averageDailyExpense: z.string(),
  incompleteGoals: z.array(dashboardGoalPreviewSchema),
  yearlyBreakdown: z.array(dashboardYearlyMonthSchema),
});

export type DashboardData = z.infer<typeof dashboardDataSchema>;
