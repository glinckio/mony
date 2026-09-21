import { BadRequestException, NotFoundException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { Prisma } from "@prisma/client";

import { PrismaService } from "../prisma/prisma.service";

import { CreateTransactionDto } from "./dto/create-transaction.dto";
import { TransactionsService } from "./transactions.service";

describe("TransactionsService", () => {
  let service: TransactionsService;
  let prisma: {
    transaction: {
      findMany: jest.Mock;
      findFirst: jest.Mock;
      count: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
      deleteMany: jest.Mock;
      aggregate: jest.Mock;
    };
    category: { findFirst: jest.Mock };
    user: { findUniqueOrThrow: jest.Mock };
    $transaction: jest.Mock;
  };

  const buildCategory = (overrides: Partial<Record<string, unknown>> = {}) => ({
    id: "cat-1",
    userId: "user-1",
    name: "Alimentação",
    type: "EXPENSE",
    color: "#3B82F6",
    icon: "restaurant-outline",
    ...overrides,
  });

  const buildTransaction = (overrides: Partial<Record<string, unknown>> = {}) => ({
    id: "tx-1",
    userId: "user-1",
    categoryId: "cat-1",
    workspace: "PERSONAL",
    type: "EXPENSE",
    status: "PENDING",
    description: "Aluguel",
    amount: new Prisma.Decimal("1500.50"),
    date: new Date("2026-01-15T00:00:00.000Z"),
    recurring: false,
    createdAt: new Date("2026-01-15T12:00:00.000Z"),
    updatedAt: new Date("2026-01-15T12:00:00.000Z"),
    ...overrides,
  });

  beforeEach(async () => {
    prisma = {
      transaction: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        count: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        deleteMany: jest.fn(),
        aggregate: jest.fn(),
      },
      category: { findFirst: jest.fn() },
      user: {
        findUniqueOrThrow: jest.fn().mockResolvedValue({ activeWorkspace: "PERSONAL" }),
      },
      $transaction: jest.fn((ops: unknown) =>
        Array.isArray(ops) ? Promise.all(ops) : ops,
      ),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [TransactionsService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get(TransactionsService);
  });

  describe("create", () => {
    const baseDto: CreateTransactionDto = {
      categoryId: "cat-1",
      type: "EXPENSE",
      description: "Aluguel",
      amount: 1500.5,
      date: "2026-01-15",
    };

    it("forces status=PAID for income regardless of what's submitted", async () => {
      prisma.category.findFirst.mockResolvedValue(buildCategory({ type: "INCOME" }));
      prisma.transaction.create.mockResolvedValue(
        buildTransaction({ type: "INCOME", status: "PAID" }),
      );

      await service.create("user-1", {
        ...baseDto,
        type: "INCOME",
        status: "PENDING" as never,
      });

      const createArgs = prisma.transaction.create.mock.calls[0][0];
      expect(createArgs.data.status).toBe("PAID");
    });

    it("defaults expense status to PENDING when omitted", async () => {
      prisma.category.findFirst.mockResolvedValue(buildCategory());
      prisma.transaction.create.mockResolvedValue(buildTransaction());

      await service.create("user-1", baseDto);

      expect(prisma.transaction.create.mock.calls[0][0].data.status).toBe("PENDING");
    });

    it("rejects when the category doesn't belong to the user", async () => {
      prisma.category.findFirst.mockResolvedValue(null);

      await expect(service.create("user-1", baseDto)).rejects.toBeInstanceOf(NotFoundException);
      expect(prisma.transaction.create).not.toHaveBeenCalled();
    });

    it("rejects when the category's type doesn't match the transaction's type", async () => {
      prisma.category.findFirst.mockResolvedValue(buildCategory({ type: "INCOME" }));

      await expect(service.create("user-1", baseDto)).rejects.toBeInstanceOf(
        BadRequestException,
      );
      expect(prisma.transaction.create).not.toHaveBeenCalled();
    });

    it("generates recurringMonths total rows with numbered suffixes and PENDING future expenses", async () => {
      prisma.category.findFirst.mockResolvedValue(buildCategory());
      prisma.transaction.create.mockImplementation(({ data }: { data: Record<string, unknown> }) =>
        Promise.resolve(buildTransaction(data)),
      );

      const result = await service.create("user-1", {
        ...baseDto,
        recurring: true,
        recurringMonths: 3,
      });

      expect(Array.isArray(result)).toBe(true);
      const rows = result as Array<{ description: string; recurring: boolean; status: string }>;
      expect(rows).toHaveLength(3);
      expect(rows[0]!.description).toBe("Aluguel");
      expect(rows[0]!.recurring).toBe(true);
      expect(rows[1]!.description).toBe("Aluguel (2/3)");
      expect(rows[1]!.recurring).toBe(false);
      expect(rows[1]!.status).toBe("PENDING");
      expect(rows[2]!.description).toBe("Aluguel (3/3)");
    });

    it("marks future recurring income copies as PAID", async () => {
      prisma.category.findFirst.mockResolvedValue(buildCategory({ type: "INCOME" }));
      prisma.transaction.create.mockImplementation(({ data }: { data: Record<string, unknown> }) =>
        Promise.resolve(buildTransaction(data)),
      );

      const result = await service.create("user-1", {
        ...baseDto,
        type: "INCOME",
        recurring: true,
        recurringMonths: 2,
      });

      const rows = result as Array<{ status: string }>;
      expect(rows[0]!.status).toBe("PAID");
      expect(rows[1]!.status).toBe("PAID");
    });

    it("does not generate extra rows when recurringMonths is 1", async () => {
      prisma.category.findFirst.mockResolvedValue(buildCategory());
      prisma.transaction.create.mockResolvedValue(buildTransaction({ recurring: true }));

      const result = await service.create("user-1", {
        ...baseDto,
        recurring: true,
        recurringMonths: 1,
      });

      expect(Array.isArray(result)).toBe(false);
      expect(prisma.transaction.create).toHaveBeenCalledTimes(1);
    });
  });

  describe("updateStatus", () => {
    it("rejects with 400 when the transaction isn't an expense", async () => {
      const income = buildTransaction({ type: "INCOME" });
      prisma.transaction.findFirst.mockResolvedValue(income);

      await expect(
        service.updateStatus("user-1", "tx-1", { status: "PENDING" }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(prisma.transaction.update).not.toHaveBeenCalled();
    });

    it("updates the status for an expense", async () => {
      const expense = buildTransaction({ type: "EXPENSE" });
      prisma.transaction.findFirst.mockResolvedValue(expense);
      prisma.transaction.update.mockResolvedValue(buildTransaction({ status: "PAID" }));

      const result = await service.updateStatus("user-1", "tx-1", { status: "PAID" });

      expect(prisma.transaction.update).toHaveBeenCalledWith({
        where: { id: "tx-1" },
        data: { status: "PAID" },
      });
      expect(result.status).toBe("PAID");
    });

    it("rejects with 404 when the transaction doesn't belong to the user", async () => {
      prisma.transaction.findFirst.mockResolvedValue(null);

      await expect(
        service.updateStatus("user-1", "tx-1", { status: "PAID" }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe("summary", () => {
    it("computes totals and balance excluding pending expenses", async () => {
      prisma.transaction.aggregate
        .mockResolvedValueOnce({ _sum: { amount: new Prisma.Decimal("5000") } }) // income
        .mockResolvedValueOnce({ _sum: { amount: new Prisma.Decimal("3200") } }) // paid expenses
        .mockResolvedValueOnce({ _sum: { amount: new Prisma.Decimal("450") } }); // pending expenses

      const result = await service.summary("user-1", "2026-01-01", "2026-01-31");

      expect(result).toEqual({
        totalIncome: "5000.00",
        totalExpensesPaid: "3200.00",
        totalExpensesPending: "450.00",
        balance: "1800.00",
      });
    });

    it("returns zeroed totals when there are no transactions in range", async () => {
      prisma.transaction.aggregate.mockResolvedValue({ _sum: { amount: null } });

      const result = await service.summary("user-1", "2026-01-01", "2026-01-31");

      expect(result).toEqual({
        totalIncome: "0.00",
        totalExpensesPaid: "0.00",
        totalExpensesPending: "0.00",
        balance: "0.00",
      });
    });
  });

  describe("bulkDelete", () => {
    it("deletes all given ids when every one is owned by the user", async () => {
      prisma.transaction.count.mockResolvedValue(2);

      await service.bulkDelete("user-1", { ids: ["tx-1", "tx-2"] });

      expect(prisma.transaction.deleteMany).toHaveBeenCalledWith({
        where: { id: { in: ["tx-1", "tx-2"] }, userId: "user-1" },
      });
    });

    it("rejects with 400 when not every id is owned by the user", async () => {
      prisma.transaction.count.mockResolvedValue(1);

      await expect(
        service.bulkDelete("user-1", { ids: ["tx-1", "tx-2"] }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(prisma.transaction.deleteMany).not.toHaveBeenCalled();
    });
  });
});
