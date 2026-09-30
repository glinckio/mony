import { BadRequestException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { Prisma } from "@prisma/client";

import { PrismaService } from "../prisma/prisma.service";

import { ReportsService } from "./reports.service";

const D = (value: string) => new Prisma.Decimal(value);

describe("ReportsService", () => {
  let service: ReportsService;
  let prisma: {
    user: { findUniqueOrThrow: jest.Mock };
    transaction: { groupBy: jest.Mock };
    category: { findMany: jest.Mock };
    $queryRaw: jest.Mock;
  };
  // What each raw query answers: the range's months, the 12-month window's
  // months (told apart by their start date) and the weekdays.
  let rangeMonths: unknown[];
  let trendMonths: unknown[];
  let weekdays: unknown[];

  beforeEach(async () => {
    rangeMonths = [];
    trendMonths = [];
    weekdays = [];
    prisma = {
      user: { findUniqueOrThrow: jest.fn().mockResolvedValue({ activeWorkspace: "PERSONAL" }) },
      transaction: { groupBy: jest.fn().mockResolvedValue([]) },
      category: { findMany: jest.fn().mockResolvedValue([]) },
      $queryRaw: jest.fn((strings: TemplateStringsArray, ...values: unknown[]) => {
        if (strings.join("?").includes("DOW")) return Promise.resolve(weekdays);
        return Promise.resolve(values[2] === "2025-10-01" ? trendMonths : rangeMonths);
      }),
    };
    const module: TestingModule = await Test.createTestingModule({
      providers: [ReportsService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    service = module.get(ReportsService);
    // Only the clock is faked: "today" is 2026-09-29 (UTC).
    jest.useFakeTimers({
      now: new Date("2026-09-29T12:00:00Z"),
      doNotFake: [
        "nextTick",
        "setImmediate",
        "clearImmediate",
        "setTimeout",
        "clearTimeout",
        "setInterval",
        "clearInterval",
        "queueMicrotask",
        "hrtime",
        "performance",
      ],
    });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe("get", () => {
    it("builds the report from the aggregates, exact to the cent", async () => {
      rangeMonths = [
        { month: "2026-07", income: D("3000.10"), expensesPaid: D("1800.20") },
        { month: "2026-08", income: D("0.20"), expensesPaid: D("0.10") },
      ];
      trendMonths = [{ month: "2026-09", income: D("40.00"), expensesPaid: D("25.00") }];
      weekdays = [{ weekday: 3, total: D("12.50") }];
      prisma.transaction.groupBy.mockImplementation(({ where }: { where: { type: string } }) =>
        Promise.resolve(
          where.type === "EXPENSE"
            ? [
                { categoryId: "c2", _sum: { amount: D("900.00") } },
                { categoryId: "c1", _sum: { amount: D("100.00") } },
              ]
            : [],
        ),
      );
      // The lookup comes back in its own order; the report keeps the ranking.
      prisma.category.findMany.mockResolvedValue([
        { id: "c1", name: "Luz", color: "#111111", icon: "flash" },
        { id: "c2", name: "Aluguel", color: "#222222", icon: "home" },
      ]);

      const report = await service.get("user-1", { dateFrom: "2026-07-01", dateTo: "2026-08-31" });

      expect(report.dateFrom).toBe("2026-07-01");
      expect(report.dateTo).toBe("2026-08-31");
      expect(report.summary).toEqual({
        totalIncome: "3000.30",
        totalExpensesPaid: "1800.30",
        balance: "1200.00",
        expenseRatio: 1800.3 / 3000.3,
      });
      expect(report.monthly).toEqual([
        { month: "2026-07", income: "3000.10", expensesPaid: "1800.20", balance: "1199.90" },
        { month: "2026-08", income: "0.20", expensesPaid: "0.10", balance: "0.10" },
      ]);
      expect(report.topExpenseCategories).toEqual([
        { categoryId: "c2", name: "Aluguel", color: "#222222", icon: "home", total: "900.00" },
        { categoryId: "c1", name: "Luz", color: "#111111", icon: "flash", total: "100.00" },
      ]);
      expect(report.topIncomeCategories).toEqual([]);
      expect(report.expensesByWeekday).toHaveLength(7);
      expect(report.expensesByWeekday[3]).toEqual({ weekday: 3, total: "12.50" });
      expect(report.expensesByWeekday[0]).toEqual({ weekday: 0, total: "0.00" });
      expect(report.last12Months).toHaveLength(12);
      expect(report.last12Months[0]).toEqual({
        month: "2025-10",
        income: "0.00",
        expensesPaid: "0.00",
      });
      expect(report.last12Months[11]).toEqual({
        month: "2026-09",
        income: "40.00",
        expensesPaid: "25.00",
      });
    });

    it("asks for the active notebook's figures, paid expenses only", async () => {
      // Read from the user row, never the JWT (stale after a switch).
      prisma.user.findUniqueOrThrow.mockResolvedValue({ activeWorkspace: "BUSINESS" });
      prisma.transaction.groupBy.mockResolvedValue([
        { categoryId: "c1", _sum: { amount: D("10.00") } },
      ]);

      await service.get("user-1", {});

      const wheres = prisma.transaction.groupBy.mock.calls.map(([args]) => args.where);
      expect(wheres).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ workspace: "BUSINESS", type: "EXPENSE", status: "PAID" }),
          expect.objectContaining({ workspace: "BUSINESS", type: "INCOME" }),
        ]),
      );
      const income = wheres.find((where) => where.type === "INCOME");
      expect(income).not.toHaveProperty("status");
      for (const [, userId, workspace, dateFrom, dateTo] of prisma.$queryRaw.mock.calls) {
        expect([userId, workspace]).toEqual(["user-1", "BUSINESS"]);
        expect(dateFrom <= dateTo).toBe(true);
      }
      // The names are looked up among the user's own categories only.
      expect(prisma.category.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { userId: "user-1", id: { in: ["c1"] } } }),
      );
    });

    it("leaves out a ranked category the lookup doesn't return", async () => {
      prisma.transaction.groupBy.mockImplementation(({ where }: { where: { type: string } }) =>
        Promise.resolve(
          where.type === "EXPENSE"
            ? [
                { categoryId: "foreign", _sum: { amount: D("500.00") } },
                { categoryId: "c1", _sum: { amount: D("100.00") } },
              ]
            : [],
        ),
      );
      prisma.category.findMany.mockResolvedValue([
        { id: "c1", name: "Luz", color: "#111111", icon: "flash" },
      ]);

      const report = await service.get("user-1", {});

      expect(report.topExpenseCategories.map((category) => category.categoryId)).toEqual(["c1"]);
    });

    it("rejects half a range or an inverted one before querying", async () => {
      await expect(service.get("user-1", { dateFrom: "2026-09-01" })).rejects.toThrow(
        new BadRequestException("dateFrom and dateTo must be given together."),
      );
      await expect(service.get("user-1", { dateTo: "2026-09-30" })).rejects.toThrow(
        BadRequestException,
      );
      await expect(
        service.get("user-1", { dateFrom: "2026-10-01", dateTo: "2026-09-01" }),
      ).rejects.toThrow(new BadRequestException("dateFrom must not be after dateTo."));
      expect(prisma.user.findUniqueOrThrow).not.toHaveBeenCalled();
      expect(prisma.$queryRaw).not.toHaveBeenCalled();
      expect(prisma.transaction.groupBy).not.toHaveBeenCalled();
    });
  });
});
