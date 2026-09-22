import { BadRequestException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { Prisma } from "@prisma/client";

import { todayDateOnlyString } from "../common/utils/date.util";
import { GoalsService } from "../goals/goals.service";
import { PrismaService } from "../prisma/prisma.service";
import { TransactionsService } from "../transactions/transactions.service";

import { DashboardService } from "./dashboard.service";

describe("DashboardService", () => {
  let service: DashboardService;
  let prisma: {
    user: { findUniqueOrThrow: jest.Mock };
    transaction: { aggregate: jest.Mock; findMany: jest.Mock };
  };
  let transactionsService: { summary: jest.Mock };
  let goalsService: { list: jest.Mock };

  const buildGoal = (overrides: Partial<Record<string, unknown>> = {}) => ({
    id: "goal-1",
    title: "Viagem",
    targetAmount: "5000.00",
    currentAmount: "1000.00",
    targetDate: "2026-12-01",
    completed: false,
    ...overrides,
  });

  beforeEach(async () => {
    prisma = {
      user: {
        findUniqueOrThrow: jest.fn().mockResolvedValue({ activeWorkspace: "PERSONAL" }),
      },
      transaction: {
        aggregate: jest.fn().mockResolvedValue({ _sum: { amount: null } }),
        findMany: jest.fn().mockResolvedValue([]),
      },
    };
    transactionsService = {
      summary: jest.fn().mockResolvedValue({
        totalIncome: "1000.00",
        totalExpensesPaid: "500.00",
        totalExpensesPending: "0.00",
        balance: "500.00",
      }),
    };
    goalsService = { list: jest.fn().mockResolvedValue([]) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DashboardService,
        { provide: PrismaService, useValue: prisma },
        { provide: TransactionsService, useValue: transactionsService },
        { provide: GoalsService, useValue: goalsService },
      ],
    }).compile();

    service = module.get(DashboardService);
  });

  describe("period resolution", () => {
    it("defaults to the current calendar month", async () => {
      await service.get("user-1", { period: "month" });
      expect(transactionsService.summary).toHaveBeenCalledWith(
        "user-1",
        expect.stringMatching(/-01$/),
        expect.any(String),
        "PERSONAL",
      );
    });

    it("uses today for period=day", async () => {
      const today = todayDateOnlyString();
      await service.get("user-1", { period: "day" });
      expect(transactionsService.summary).toHaveBeenCalledWith("user-1", today, today, "PERSONAL");
    });

    it("uses the last 7 days for period=week", async () => {
      await service.get("user-1", { period: "week" });
      const [, dateFrom, dateTo] = transactionsService.summary.mock.calls[0];
      expect(dateTo).toBe(todayDateOnlyString());
      expect(dateFrom < dateTo).toBe(true);
    });

    it("uses the given range for period=custom", async () => {
      await service.get("user-1", { period: "custom", dateFrom: "2026-01-01", dateTo: "2026-01-15" });
      expect(transactionsService.summary).toHaveBeenCalledWith(
        "user-1",
        "2026-01-01",
        "2026-01-15",
        "PERSONAL",
      );
    });

    it("rejects period=custom missing dateFrom/dateTo", async () => {
      await expect(service.get("user-1", { period: "custom" })).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });

    it("rejects period=custom with dateFrom after dateTo", async () => {
      await expect(
        service.get("user-1", { period: "custom", dateFrom: "2026-02-01", dateTo: "2026-01-01" }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe("expenseRatio", () => {
    it("computes paidExpenses/income", async () => {
      const result = await service.get("user-1", { period: "month" });
      expect(result.summary.expenseRatio).toBe(0.5);
    });

    it("is 0 when income is 0 (avoids division by zero)", async () => {
      transactionsService.summary.mockResolvedValue({
        totalIncome: "0.00",
        totalExpensesPaid: "100.00",
        totalExpensesPending: "0.00",
        balance: "-100.00",
      });
      const result = await service.get("user-1", { period: "month" });
      expect(result.summary.expenseRatio).toBe(0);
    });
  });

  describe("previousPeriodIncomeChangePercent", () => {
    it("computes percentage change against the equivalent prior period", async () => {
      prisma.transaction.aggregate.mockResolvedValue({ _sum: { amount: new Prisma.Decimal(500) } });
      const result = await service.get("user-1", { period: "month" });
      expect(result.previousPeriodIncomeChangePercent).toBe(100);
    });

    it("is null when the previous period had 0 income", async () => {
      prisma.transaction.aggregate.mockResolvedValue({ _sum: { amount: null } });
      const result = await service.get("user-1", { period: "month" });
      expect(result.previousPeriodIncomeChangePercent).toBeNull();
    });
  });

  describe("averageDailyExpense", () => {
    it("divides paid expenses by the number of days in range", async () => {
      const result = await service.get("user-1", {
        period: "custom",
        dateFrom: "2026-01-01",
        dateTo: "2026-01-10",
      });
      expect(result.averageDailyExpense).toBe("50.00");
    });
  });

  describe("incompleteGoals", () => {
    it("limits to 3, sorted by targetDate ascending", async () => {
      goalsService.list.mockResolvedValue([
        buildGoal({ id: "g1", targetDate: "2026-06-01" }),
        buildGoal({ id: "g2", targetDate: "2026-01-01" }),
        buildGoal({ id: "g3", targetDate: null }),
        buildGoal({ id: "g4", targetDate: "2026-03-01" }),
      ]);

      const result = await service.get("user-1", { period: "month" });

      expect(result.incompleteGoals.map((g) => g.id)).toEqual(["g2", "g4", "g1"]);
      expect(goalsService.list).toHaveBeenCalledWith("user-1", false, "PERSONAL");
    });
  });

  describe("yearlyBreakdown", () => {
    it("has 12 entries even with no transactions", async () => {
      const result = await service.get("user-1", { period: "month" });
      expect(result.yearlyBreakdown).toHaveLength(12);
      expect(result.yearlyBreakdown[0]).toEqual({ month: 1, income: "0.00", expensesPaid: "0.00" });
    });

    it("sums income and paid expenses per month, ignoring pending", async () => {
      const year = Number(todayDateOnlyString().slice(0, 4));
      prisma.transaction.findMany.mockResolvedValue([
        {
          date: new Date(Date.UTC(year, 0, 15)),
          type: "INCOME",
          status: "PAID",
          amount: new Prisma.Decimal(1000),
        },
        {
          date: new Date(Date.UTC(year, 0, 20)),
          type: "EXPENSE",
          status: "PAID",
          amount: new Prisma.Decimal(300),
        },
        {
          date: new Date(Date.UTC(year, 0, 21)),
          type: "EXPENSE",
          status: "PENDING",
          amount: new Prisma.Decimal(999),
        },
      ]);

      const result = await service.get("user-1", { period: "month" });

      expect(result.yearlyBreakdown[0]).toEqual({ month: 1, income: "1000.00", expensesPaid: "300.00" });
    });
  });
});
