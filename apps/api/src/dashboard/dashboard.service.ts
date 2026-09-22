import { BadRequestException, Injectable } from "@nestjs/common";
import { Prisma, type WorkspaceType } from "@prisma/client";

import {
  addDaysToDateString,
  daysBetweenInclusive,
  endOfMonthDateString,
  parseDateOnly,
  startOfMonthDateString,
  todayDateOnlyString,
} from "../common/utils/date.util";
import { decimalToString } from "../common/utils/money.util";
import { GoalsService } from "../goals/goals.service";
import { PrismaService } from "../prisma/prisma.service";
import { TransactionsService } from "../transactions/transactions.service";

import { DashboardQueryDto } from "./dto/dashboard-query.dto";
import { DashboardDto } from "./dto/dashboard.dto";

@Injectable()
export class DashboardService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly transactionsService: TransactionsService,
    private readonly goalsService: GoalsService,
  ) {}

  async get(userId: string, query: DashboardQueryDto): Promise<DashboardDto> {
    const [dateFrom, dateTo] = this.resolvePeriod(query);
    const workspace = await this.getActiveWorkspace(userId);

    const [summaryRaw, previousIncome, incompleteGoals, yearlyBreakdown] = await Promise.all([
      this.transactionsService.summary(userId, dateFrom, dateTo, workspace),
      this.previousPeriodIncome(userId, workspace, dateFrom, dateTo),
      this.goalsService.list(userId, false, workspace),
      this.yearlyBreakdown(userId, workspace),
    ]);

    const totalIncome = Number(summaryRaw.totalIncome);
    const totalExpensesPaid = Number(summaryRaw.totalExpensesPaid);
    const expenseRatio = totalIncome > 0 ? totalExpensesPaid / totalIncome : 0;
    const averageDailyExpense = totalExpensesPaid / daysBetweenInclusive(dateFrom, dateTo);

    const previousPeriodIncomeChangePercent =
      previousIncome > 0 ? ((totalIncome - previousIncome) / previousIncome) * 100 : null;

    return {
      summary: { ...summaryRaw, expenseRatio },
      previousPeriodIncomeChangePercent,
      averageDailyExpense: averageDailyExpense.toFixed(2),
      incompleteGoals: incompleteGoals
        .sort((a, b) => (a.targetDate ?? "9999-99-99").localeCompare(b.targetDate ?? "9999-99-99"))
        .slice(0, 3)
        .map((goal) => ({
          id: goal.id,
          title: goal.title,
          targetAmount: goal.targetAmount,
          currentAmount: goal.currentAmount,
          targetDate: goal.targetDate,
        })),
      yearlyBreakdown,
    };
  }

  private resolvePeriod(query: DashboardQueryDto): [string, string] {
    const today = todayDateOnlyString();

    switch (query.period) {
      case "day":
        return [today, today];
      case "week":
        return [addDaysToDateString(today, -6), today];
      case "custom": {
        if (!query.dateFrom || !query.dateTo) {
          throw new BadRequestException("dateFrom and dateTo are required when period=custom.");
        }
        if (query.dateFrom > query.dateTo) {
          throw new BadRequestException("dateFrom must not be after dateTo.");
        }
        return [query.dateFrom, query.dateTo];
      }
      case "month":
      default:
        return [startOfMonthDateString(today), endOfMonthDateString(today)];
    }
  }

  private async previousPeriodIncome(
    userId: string,
    workspace: WorkspaceType,
    dateFrom: string,
    dateTo: string,
  ): Promise<number> {
    const lengthDays = daysBetweenInclusive(dateFrom, dateTo);
    const previousDateTo = addDaysToDateString(dateFrom, -1);
    const previousDateFrom = addDaysToDateString(previousDateTo, -(lengthDays - 1));

    const agg = await this.prisma.transaction.aggregate({
      where: {
        userId,
        workspace,
        type: "INCOME",
        date: { gte: parseDateOnly(previousDateFrom), lte: parseDateOnly(previousDateTo) },
      },
      _sum: { amount: true },
    });

    return (agg._sum.amount ?? new Prisma.Decimal(0)).toNumber();
  }

  // A single query over the current year's transactions, reduced in JS —
  // deliberately not 12 separate per-month queries (N+1), and simpler
  // than a raw SQL date_trunc GROUP BY for a dataset this size (one
  // user's yearly transactions).
  private async yearlyBreakdown(
    userId: string,
    workspace: WorkspaceType,
  ): Promise<Array<{ month: number; income: string; expensesPaid: string }>> {
    const year = Number(todayDateOnlyString().slice(0, 4));
    const yearStart = parseDateOnly(`${year}-01-01`);
    const yearEnd = parseDateOnly(`${year}-12-31`);

    const transactions = await this.prisma.transaction.findMany({
      where: { userId, workspace, date: { gte: yearStart, lte: yearEnd } },
      select: { date: true, type: true, status: true, amount: true },
    });

    const months = Array.from({ length: 12 }, (_, i) => ({
      month: i + 1,
      income: new Prisma.Decimal(0),
      expensesPaid: new Prisma.Decimal(0),
    }));

    for (const transaction of transactions) {
      const month = months[transaction.date.getUTCMonth()]!;
      if (transaction.type === "INCOME") {
        month.income = month.income.add(transaction.amount);
      } else if (transaction.status === "PAID") {
        month.expensesPaid = month.expensesPaid.add(transaction.amount);
      }
    }

    return months.map((m) => ({
      month: m.month,
      income: decimalToString(m.income),
      expensesPaid: decimalToString(m.expensesPaid),
    }));
  }

  private async getActiveWorkspace(userId: string): Promise<WorkspaceType> {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { activeWorkspace: true },
    });
    return user.activeWorkspace;
  }
}
