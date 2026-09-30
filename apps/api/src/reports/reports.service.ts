import { REPORT_TOP_CATEGORIES } from "@mony/shared-types";
import { Injectable } from "@nestjs/common";
import { Prisma, type TransactionType, type WorkspaceType } from "@prisma/client";

import { parseDateOnly, todayDateOnlyString } from "../common/utils/date.util";
import { decimalToString } from "../common/utils/money.util";
import { PrismaService } from "../prisma/prisma.service";

import type { ReportQueryDto } from "./dto/report-query.dto";
import type { ReportCategoryDto, ReportDto, ReportMonthDto } from "./dto/report.dto";
import {
  expenseRatio,
  fillMonths,
  fillWeekdays,
  lastTwelveMonths,
  resolveRange,
} from "./report-math";

type MonthRow = { month: string; income: Prisma.Decimal; expensesPaid: Prisma.Decimal };

// Legacy's "Relatórios Financeiros" (docs/specs/reports). Every figure is
// aggregated in Postgres, scoped to the user's active workspace.
//
// EXPENSES ARE PAID ONES ONLY — `status = 'PAID'` in every expense sum
// below. Legacy's reports summed every expense; docs/steering/product.md
// ("Legacy behavior — decisions") standardizes on paid-only, like the
// dashboard. Don't "fix" it back to legacy.
@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async get(userId: string, query: ReportQueryDto): Promise<ReportDto> {
    const today = todayDateOnlyString();
    const [dateFrom, dateTo] = resolveRange(query, today);
    const trend = lastTwelveMonths(today);
    const workspace = await this.activeWorkspace(userId);

    const [monthly, topExpense, topIncome, weekdays, trendRows] = await Promise.all([
      this.monthly(userId, workspace, dateFrom, dateTo),
      this.topCategories(userId, workspace, "EXPENSE", dateFrom, dateTo),
      this.topCategories(userId, workspace, "INCOME", dateFrom, dateTo),
      this.expensesByWeekday(userId, workspace, dateFrom, dateTo),
      this.monthly(userId, workspace, trend.dateFrom, trend.dateTo),
    ]);

    const totalIncome = monthly.reduce((sum, row) => sum.add(row.income), new Prisma.Decimal(0));
    const totalExpensesPaid = monthly.reduce(
      (sum, row) => sum.add(row.expensesPaid),
      new Prisma.Decimal(0),
    );

    return {
      dateFrom,
      dateTo,
      summary: {
        totalIncome: decimalToString(totalIncome),
        totalExpensesPaid: decimalToString(totalExpensesPaid),
        balance: decimalToString(totalIncome.sub(totalExpensesPaid)),
        expenseRatio: expenseRatio(totalIncome.toNumber(), totalExpensesPaid.toNumber()),
      },
      monthly: monthly.map((row): ReportMonthDto => ({
        month: row.month,
        income: decimalToString(row.income),
        expensesPaid: decimalToString(row.expensesPaid),
        balance: decimalToString(row.income.sub(row.expensesPaid)),
      })),
      topExpenseCategories: topExpense,
      topIncomeCategories: topIncome,
      expensesByWeekday: fillWeekdays(weekdays),
      last12Months: fillMonths(
        trend.months,
        trendRows.map((row) => ({
          month: row.month,
          income: decimalToString(row.income),
          expensesPaid: decimalToString(row.expensesPaid),
        })),
        (month) => ({ month, income: "0.00", expensesPaid: "0.00" }),
      ),
    };
  }

  // Income and paid expenses per month that has any in the range.
  private monthly(
    userId: string,
    workspace: WorkspaceType,
    dateFrom: string,
    dateTo: string,
  ): Promise<MonthRow[]> {
    return this.prisma.$queryRaw<MonthRow[]>`
      SELECT to_char(date_trunc('month', "date"), 'YYYY-MM') AS "month",
        COALESCE(SUM("amount") FILTER (WHERE "type" = 'INCOME'), 0) AS "income",
        COALESCE(SUM("amount") FILTER (WHERE "type" = 'EXPENSE' AND "status" = 'PAID'), 0)
          AS "expensesPaid"
      FROM "Transaction"
      WHERE "userId" = ${userId}
        AND "workspace" = CAST(${workspace} AS "WorkspaceType")
        AND "date" BETWEEN CAST(${dateFrom} AS date) AND CAST(${dateTo} AS date)
        -- Only what counts: a month holding only pending expenses (e.g.
        -- recurring ones generated ahead) isn't a month of the report.
        AND ("type" = 'INCOME' OR "status" = 'PAID')
      GROUP BY date_trunc('month', "date")
      ORDER BY 1`;
  }

  // Legacy's top 5 by total, largest first (paid, for expenses).
  private async topCategories(
    userId: string,
    workspace: WorkspaceType,
    type: TransactionType,
    dateFrom: string,
    dateTo: string,
  ): Promise<ReportCategoryDto[]> {
    const groups = await this.prisma.transaction.groupBy({
      by: ["categoryId"],
      where: {
        userId,
        workspace,
        type,
        ...(type === "EXPENSE" ? { status: "PAID" as const } : {}),
        date: { gte: parseDateOnly(dateFrom), lte: parseDateOnly(dateTo) },
      },
      _sum: { amount: true },
      orderBy: [{ _sum: { amount: "desc" } }, { categoryId: "asc" }],
      take: REPORT_TOP_CATEGORIES,
    });
    if (groups.length === 0) return [];
    const categories = await this.prisma.category.findMany({
      // Scoped to the user too: the DB doesn't tie a transaction's category
      // to its owner, so this doesn't rely on every write path checking it.
      where: { userId, id: { in: groups.map((group) => group.categoryId) } },
      select: { id: true, name: true, color: true, icon: true },
    });
    const byId = new Map(categories.map((category) => [category.id, category]));
    return groups.flatMap((group) => {
      const category = byId.get(group.categoryId);
      return category
        ? [
            {
              categoryId: category.id,
              name: category.name,
              color: category.color,
              icon: category.icon,
              total: decimalToString(group._sum.amount),
            },
          ]
        : [];
    });
  }

  // Paid expenses per weekday (0 = Sunday, legacy's DAYOFWEEK − 1).
  private async expensesByWeekday(
    userId: string,
    workspace: WorkspaceType,
    dateFrom: string,
    dateTo: string,
  ): Promise<Array<{ weekday: number; total: string }>> {
    const rows = await this.prisma.$queryRaw<Array<{ weekday: number; total: Prisma.Decimal }>>`
      SELECT CAST(EXTRACT(DOW FROM "date") AS integer) AS "weekday", SUM("amount") AS "total"
      FROM "Transaction"
      WHERE "userId" = ${userId}
        AND "workspace" = CAST(${workspace} AS "WorkspaceType")
        AND "type" = 'EXPENSE' AND "status" = 'PAID'
        AND "date" BETWEEN CAST(${dateFrom} AS date) AND CAST(${dateTo} AS date)
      GROUP BY 1`;
    return rows.map((row) => ({ weekday: row.weekday, total: decimalToString(row.total) }));
  }

  // Read fresh, never from the JWT (it can be stale after a switch).
  private async activeWorkspace(userId: string): Promise<WorkspaceType> {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { activeWorkspace: true },
    });
    return user.activeWorkspace;
  }
}
