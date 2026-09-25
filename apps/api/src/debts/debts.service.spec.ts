import { BadRequestException, NotFoundException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { Prisma } from "@prisma/client";

import { PrismaService } from "../prisma/prisma.service";

import { DebtsService } from "./debts.service";

// Pinned "today" so due-date-vs-today rules are deterministic.
jest.mock("../common/utils/date.util", () => ({
  ...jest.requireActual("../common/utils/date.util"),
  todayDateOnlyString: () => "2026-02-10",
}));

const d = (value: string) => new Prisma.Decimal(value);
const date = (value: string) => new Date(`${value}T00:00:00.000Z`);

describe("DebtsService", () => {
  let service: DebtsService;
  let prisma: {
    user: { findUniqueOrThrow: jest.Mock };
    category: { findFirst: jest.Mock };
    debt: {
      create: jest.Mock;
      update: jest.Mock;
      updateMany: jest.Mock;
      findFirst: jest.Mock;
      findMany: jest.Mock;
      findUniqueOrThrow: jest.Mock;
      delete: jest.Mock;
    };
    debtInstallment: {
      createMany: jest.Mock;
      findMany: jest.Mock;
      findFirst: jest.Mock;
      update: jest.Mock;
      updateMany: jest.Mock;
      deleteMany: jest.Mock;
    };
    transaction: {
      createMany: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      updateMany: jest.Mock;
      deleteMany: jest.Mock;
    };
    $queryRaw: jest.Mock;
    $executeRaw: jest.Mock;
    $transaction: jest.Mock;
  };

  const buildDebt = (overrides: Partial<Record<string, unknown>> = {}) => ({
    id: "debt-1",
    userId: "user-1",
    workspace: "PERSONAL",
    categoryId: "cat-1",
    name: "Financiamento",
    totalAmount: d("3000"),
    paidAmount: d("0"),
    startDate: date("2026-03-10"),
    endDate: null,
    interestRate: null,
    totalInstallments: 3,
    paidInstallments: 0,
    notes: null,
    status: "ACTIVE",
    createdAt: new Date("2026-02-10T12:00:00.000Z"),
    updatedAt: new Date("2026-02-10T12:00:00.000Z"),
    ...overrides,
  });

  const buildInstallment = (overrides: Partial<Record<string, unknown>> = {}) => ({
    id: "inst-1",
    debtId: "debt-1",
    installmentNo: 1,
    amount: d("1000"),
    dueDate: date("2026-03-10"),
    status: "PENDING",
    paymentDate: null,
    transactionId: "tx-1",
    ...overrides,
  });

  beforeEach(async () => {
    prisma = {
      user: {
        findUniqueOrThrow: jest.fn().mockResolvedValue({ activeWorkspace: "PERSONAL" }),
      },
      category: {
        findFirst: jest.fn().mockResolvedValue({ id: "cat-1", userId: "user-1", type: "EXPENSE" }),
      },
      debt: {
        create: jest.fn().mockResolvedValue(buildDebt()),
        update: jest.fn(),
        updateMany: jest.fn(),
        findFirst: jest.fn().mockResolvedValue(buildDebt()),
        findMany: jest.fn().mockResolvedValue([]),
        findUniqueOrThrow: jest.fn().mockResolvedValue({ ...buildDebt(), installments: [] }),
        delete: jest.fn(),
      },
      debtInstallment: {
        createMany: jest.fn(),
        findMany: jest.fn().mockResolvedValue([]),
        findFirst: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
        deleteMany: jest.fn(),
      },
      transaction: {
        createMany: jest.fn(),
        create: jest.fn().mockResolvedValue({ id: "tx-new" }),
        update: jest.fn(),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        deleteMany: jest.fn(),
      },
      // lockDebt: found by default.
      $queryRaw: jest.fn().mockResolvedValue([{ id: "debt-1" }]),
      $executeRaw: jest.fn(),
      $transaction: jest.fn((callback: (tx: unknown) => unknown) => callback(prisma)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [DebtsService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get(DebtsService);
  });

  describe("create", () => {
    const dto = {
      name: "Financiamento",
      totalAmount: 1000,
      totalInstallments: 3,
      startDate: "2026-01-31",
      categoryId: "cat-1",
    };

    it("splits to the cent with the remainder on the last installment, monthly due dates", async () => {
      await service.create("user-1", dto);

      const installments = prisma.debtInstallment.createMany.mock.calls[0][0].data;
      expect(installments.map((row: { amount: Prisma.Decimal }) => row.amount.toFixed(2))).toEqual([
        "333.33",
        "333.33",
        "333.34",
      ]);
      // Same calendar-month arithmetic as recurring transactions (Jan 31 + 1 month rolls over).
      expect(
        installments.map((row: { dueDate: Date }) => row.dueDate.toISOString().slice(0, 10)),
      ).toEqual(["2026-01-31", "2026-03-03", "2026-03-31"]);
      expect(installments.map((row: { installmentNo: number }) => row.installmentNo)).toEqual([
        1, 2, 3,
      ]);
    });

    it("links every installment to an expense transaction; PAID only when due on/before today", async () => {
      await service.create("user-1", { ...dto, startDate: "2026-01-10" });

      const transactions = prisma.transaction.createMany.mock.calls[0][0].data;
      const installments = prisma.debtInstallment.createMany.mock.calls[0][0].data;

      // Due 2026-01-10, 2026-02-10 (today), 2026-03-10.
      expect(transactions.map((row: { status: string }) => row.status)).toEqual([
        "PAID",
        "PAID",
        "PENDING",
      ]);
      expect(transactions[0]).toMatchObject({
        userId: "user-1",
        categoryId: "cat-1",
        workspace: "PERSONAL",
        type: "EXPENSE",
        description: "Parcela 1/3 - Financiamento",
      });
      // Legacy-literal: installments always start PENDING, even when their
      // transaction was created PAID.
      expect(installments.map((row: { status: string }) => row.status)).toEqual([
        "PENDING",
        "PENDING",
        "PENDING",
      ]);
      installments.forEach((row: { transactionId: string }, index: number) => {
        expect(row.transactionId).toBe(transactions[index].id);
      });
    });

    it("recomputes the debt's status right after creating it", async () => {
      await service.create("user-1", { ...dto, startDate: "2026-01-10" });

      expect(prisma.debtInstallment.findMany).toHaveBeenCalledWith({
        where: { debtId: "debt-1" },
        select: { status: true, amount: true, dueDate: true },
      });
      expect(prisma.debt.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: "debt-1" } }),
      );
    });

    it("falls back to the user's oldest expense category when none is given", async () => {
      prisma.category.findFirst.mockResolvedValue({ id: "cat-oldest" });

      await service.create("user-1", { ...dto, categoryId: undefined });

      expect(prisma.category.findFirst).toHaveBeenCalledWith({
        where: { userId: "user-1", type: "EXPENSE" },
        orderBy: { createdAt: "asc" },
        select: { id: true },
      });
      expect(prisma.debt.create.mock.calls[0][0].data.categoryId).toBeUndefined();
      expect(prisma.transaction.createMany.mock.calls[0][0].data[0].categoryId).toBe("cat-oldest");
    });

    it("rejects with 400 when there's no expense category to fall back to", async () => {
      prisma.category.findFirst.mockResolvedValue(null);

      await expect(
        service.create("user-1", { ...dto, categoryId: undefined }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it("rejects an income category with 400 and an unknown one with 404", async () => {
      prisma.category.findFirst.mockResolvedValueOnce({ id: "cat-1", type: "INCOME" });
      await expect(service.create("user-1", dto)).rejects.toBeInstanceOf(BadRequestException);

      prisma.category.findFirst.mockResolvedValueOnce(null);
      await expect(service.create("user-1", dto)).rejects.toBeInstanceOf(NotFoundException);
    });

    it("rejects a total that can't give every installment a cent", async () => {
      await expect(
        service.create("user-1", { ...dto, totalAmount: 0.02, totalInstallments: 3 }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it("rejects an endDate before startDate", async () => {
      await expect(
        service.create("user-1", { ...dto, endDate: "2026-01-30" }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe("update", () => {
    it("rejects an installment-count change once an installment is paid", async () => {
      prisma.debtInstallment.findMany.mockResolvedValue([
        buildInstallment({ status: "PAID" }),
        buildInstallment({ id: "inst-2", installmentNo: 2 }),
      ]);

      await expect(service.update("user-1", "debt-1", { totalInstallments: 6 })).rejects.toThrow(
        "Cannot change the number of installments once some are paid.",
      );
      expect(prisma.debt.update).not.toHaveBeenCalled();
    });

    it("rejects a start-date change once an installment is paid", async () => {
      prisma.debtInstallment.findMany.mockResolvedValue([buildInstallment({ status: "PAID" })]);

      await expect(service.update("user-1", "debt-1", { startDate: "2026-04-10" })).rejects.toThrow(
        "Cannot change the start date once some installments are paid.",
      );
    });

    it("regenerates installments and their transactions when the count changes and none are paid", async () => {
      prisma.debtInstallment.findMany.mockResolvedValue([buildInstallment()]);

      await service.update("user-1", "debt-1", { totalInstallments: 6 });

      expect(prisma.transaction.deleteMany).toHaveBeenCalledWith({
        where: { userId: "user-1", debtInstallment: { is: { debtId: "debt-1" } } },
      });
      expect(prisma.debtInstallment.deleteMany).toHaveBeenCalledWith({
        where: { debtId: "debt-1" },
      });
      const installments = prisma.debtInstallment.createMany.mock.calls[0][0].data;
      expect(installments).toHaveLength(6);
      expect(installments[0].amount.toFixed(2)).toBe("500.00");
      expect(prisma.transaction.createMany.mock.calls[0][0].data).toHaveLength(6);
    });

    it("regenerates when only the start date changes and none are paid", async () => {
      prisma.debtInstallment.findMany.mockResolvedValue([buildInstallment()]);

      await service.update("user-1", "debt-1", { startDate: "2026-04-10" });

      const installments = prisma.debtInstallment.createMany.mock.calls[0][0].data;
      expect(installments[0].dueDate.toISOString().slice(0, 10)).toBe("2026-04-10");
    });

    it("recalculates only pending installments (and their transactions) when the total changes", async () => {
      prisma.debtInstallment.findMany.mockResolvedValue([
        buildInstallment({ status: "PAID", amount: d("1000") }),
        buildInstallment({ id: "inst-2", installmentNo: 2, transactionId: "tx-2" }),
        buildInstallment({ id: "inst-3", installmentNo: 3, transactionId: "tx-3" }),
      ]);

      // (3001 - 1000 paid) / 2 pending = 1000.50 each.
      await service.update("user-1", "debt-1", { totalAmount: 3001 });

      expect(prisma.debtInstallment.updateMany).toHaveBeenCalledWith({
        where: { id: { in: ["inst-2"] } },
        data: { amount: d("1000.5") },
      });
      expect(prisma.transaction.updateMany).toHaveBeenCalledWith({
        where: { id: { in: ["tx-2"] } },
        data: { amount: d("1000.5") },
      });
      expect(prisma.debtInstallment.update).toHaveBeenCalledWith({
        where: { id: "inst-3" },
        data: { amount: d("1000.5") },
      });
      expect(prisma.transaction.update).toHaveBeenCalledWith({
        where: { id: "tx-3" },
        data: { amount: d("1000.5") },
      });
      expect(prisma.debtInstallment.createMany).not.toHaveBeenCalled();
    });

    it("rejects a total that leaves less than a cent per pending installment", async () => {
      prisma.debtInstallment.findMany.mockResolvedValue([
        buildInstallment({ status: "PAID", amount: d("1000") }),
        buildInstallment({ id: "inst-2", installmentNo: 2 }),
      ]);

      await expect(
        service.update("user-1", "debt-1", { totalAmount: 1000 }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it("rejects a total change once every installment is paid", async () => {
      prisma.debt.findUniqueOrThrow.mockResolvedValueOnce(
        buildDebt({ totalInstallments: 1, paidInstallments: 1 }),
      );
      prisma.debtInstallment.findMany.mockResolvedValue([buildInstallment({ status: "PAID" })]);

      await expect(service.update("user-1", "debt-1", { totalAmount: 5000 })).rejects.toThrow(
        "Cannot change the total amount once every installment is paid.",
      );
    });

    it("propagates a rename to linked transactions' descriptions", async () => {
      prisma.debtInstallment.findMany.mockResolvedValue([buildInstallment()]);

      await service.update("user-1", "debt-1", { name: "Carro novo" });

      expect(prisma.$executeRaw).toHaveBeenCalled();
      const [, ...values] = prisma.$executeRaw.mock.calls[0];
      expect(values).toContain("/3 - Carro novo");
      expect(values).toContain("debt-1");
    });

    it("propagates a new category to linked transactions, but not a cleared one", async () => {
      prisma.category.findFirst.mockResolvedValue({ id: "cat-2", type: "EXPENSE" });

      await service.update("user-1", "debt-1", { categoryId: "cat-2" });
      expect(prisma.transaction.updateMany).toHaveBeenCalledWith({
        where: { userId: "user-1", debtInstallment: { is: { debtId: "debt-1" } } },
        data: { categoryId: "cat-2" },
      });

      prisma.transaction.updateMany.mockClear();
      await service.update("user-1", "debt-1", { categoryId: null });
      expect(prisma.transaction.updateMany).not.toHaveBeenCalled();
      expect(prisma.debt.update.mock.calls.at(-2)[0].data.categoryId).toBeNull();
    });

    it("404s for a debt the user doesn't own (lock finds no row)", async () => {
      prisma.$queryRaw.mockResolvedValue([]);

      await expect(service.update("user-1", "debt-1", { name: "X" })).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe("payInstallment", () => {
    const dto = { paymentDate: "2026-03-05", paidAmount: 999 };

    it("marks the installment and its linked transaction paid, then recomputes the debt", async () => {
      prisma.debtInstallment.findFirst.mockResolvedValue({
        ...buildInstallment(),
        debt: buildDebt(),
      });
      prisma.debtInstallment.findMany.mockResolvedValue([
        { status: "PAID", amount: d("1000"), dueDate: date("2026-03-10") },
        { status: "PENDING", amount: d("1000"), dueDate: date("2026-04-10") },
        { status: "PENDING", amount: d("1000"), dueDate: date("2026-05-10") },
      ]);

      await service.payInstallment("user-1", "debt-1", "inst-1", dto);

      expect(prisma.transaction.updateMany).toHaveBeenCalledWith({
        where: { id: "tx-1" },
        data: { status: "PAID", date: date("2026-03-05") },
      });
      expect(prisma.transaction.create).not.toHaveBeenCalled();
      // paidAmount never overwrites the installment's own amount.
      expect(prisma.debtInstallment.update).toHaveBeenCalledWith({
        where: { id: "inst-1" },
        data: { status: "PAID", paymentDate: date("2026-03-05"), transactionId: "tx-1" },
      });
      expect(prisma.debt.update).toHaveBeenCalledWith({
        where: { id: "debt-1" },
        data: { paidAmount: d("1000"), paidInstallments: 1, status: "ACTIVE" },
      });
    });

    it("recreates the linked transaction when it was deleted", async () => {
      prisma.debtInstallment.findFirst.mockResolvedValue({
        ...buildInstallment({ transactionId: null, installmentNo: 2 }),
        debt: buildDebt(),
      });

      await service.payInstallment("user-1", "debt-1", "inst-1", dto);

      expect(prisma.transaction.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          categoryId: "cat-1",
          type: "EXPENSE",
          status: "PAID",
          description: "Parcela 2/3 - Financiamento",
          amount: 999,
          date: date("2026-03-05"),
        }),
      });
      expect(prisma.debtInstallment.update).toHaveBeenCalledWith({
        where: { id: "inst-1" },
        data: { status: "PAID", paymentDate: date("2026-03-05"), transactionId: "tx-new" },
      });
    });

    it("recreates the linked transaction when it vanished between read and write", async () => {
      prisma.debtInstallment.findFirst.mockResolvedValue({
        ...buildInstallment(),
        debt: buildDebt(),
      });
      prisma.transaction.updateMany.mockResolvedValueOnce({ count: 0 });

      await service.payInstallment("user-1", "debt-1", "inst-1", dto);

      expect(prisma.transaction.create).toHaveBeenCalled();
      expect(prisma.debtInstallment.update).toHaveBeenCalledWith({
        where: { id: "inst-1" },
        data: { status: "PAID", paymentDate: date("2026-03-05"), transactionId: "tx-new" },
      });
    });

    it("rejects paying an already paid installment", async () => {
      prisma.debtInstallment.findFirst.mockResolvedValue({
        ...buildInstallment({ status: "PAID" }),
        debt: buildDebt(),
      });

      await expect(service.payInstallment("user-1", "debt-1", "inst-1", dto)).rejects.toThrow(
        "Installment is already paid.",
      );
      expect(prisma.transaction.update).not.toHaveBeenCalled();
    });

    it("404s when the debt isn't the user's (lock finds no row)", async () => {
      prisma.$queryRaw.mockResolvedValue([]);

      await expect(service.payInstallment("user-1", "debt-1", "inst-1", dto)).rejects.toThrow(
        "Debt not found.",
      );
    });

    it("404s when the installment doesn't belong to the debt", async () => {
      prisma.debtInstallment.findFirst.mockResolvedValue(null);

      await expect(service.payInstallment("user-1", "debt-1", "inst-x", dto)).rejects.toThrow(
        "Installment not found.",
      );
    });
  });

  describe("cancelPayment", () => {
    it("reverts the installment and its transaction to pending, then recomputes", async () => {
      prisma.debtInstallment.findFirst.mockResolvedValue({
        ...buildInstallment({ status: "PAID", paymentDate: date("2026-03-05") }),
        debt: buildDebt(),
      });
      prisma.debtInstallment.findMany.mockResolvedValue([
        { status: "PENDING", amount: d("1000"), dueDate: date("2026-01-10") },
      ]);

      await service.cancelPayment("user-1", "debt-1", "inst-1");

      expect(prisma.transaction.updateMany).toHaveBeenCalledWith({
        where: { id: "tx-1" },
        data: { status: "PENDING" },
      });
      expect(prisma.debtInstallment.update).toHaveBeenCalledWith({
        where: { id: "inst-1" },
        data: { status: "PENDING", paymentDate: null },
      });
      expect(prisma.debt.update).toHaveBeenCalledWith({
        where: { id: "debt-1" },
        data: { paidAmount: d("0"), paidInstallments: 0, status: "OVERDUE" },
      });
    });

    it("rejects cancelling an installment that isn't paid", async () => {
      prisma.debtInstallment.findFirst.mockResolvedValue({
        ...buildInstallment(),
        debt: buildDebt(),
      });

      await expect(service.cancelPayment("user-1", "debt-1", "inst-1")).rejects.toThrow(
        "Installment is not paid.",
      );
    });
  });

  describe("list", () => {
    it("flips stale ACTIVE debts to OVERDUE before listing the active workspace's debts", async () => {
      await service.list("user-1", "OVERDUE");

      expect(prisma.debt.updateMany).toHaveBeenCalledWith({
        where: {
          userId: "user-1",
          workspace: "PERSONAL",
          status: "ACTIVE",
          installments: { some: { status: "PENDING", dueDate: { lt: date("2026-02-10") } } },
        },
        data: { status: "OVERDUE" },
      });
      expect(prisma.debt.findMany).toHaveBeenCalledWith({
        where: { userId: "user-1", workspace: "PERSONAL", status: "OVERDUE" },
        orderBy: [{ startDate: "desc" }, { createdAt: "desc" }],
      });
      expect(prisma.debt.updateMany.mock.invocationCallOrder[0]).toBeLessThan(
        prisma.debt.findMany.mock.invocationCallOrder[0]!,
      );
    });

    it("computes remainingAmount with exact decimals", async () => {
      prisma.debt.findMany.mockResolvedValue([
        buildDebt({ totalAmount: d("2383.29"), paidAmount: d("476.65"), interestRate: d("1.5") }),
      ]);

      const [debt] = await service.list("user-1");

      expect(debt).toMatchObject({
        totalAmount: "2383.29",
        paidAmount: "476.65",
        remainingAmount: "1906.64",
        interestRate: "1.50",
      });
    });
  });

  describe("findOne", () => {
    it("404s for a debt the user doesn't own", async () => {
      prisma.debt.findFirst.mockResolvedValue(null);

      await expect(service.findOne("user-1", "debt-1")).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe("delete", () => {
    it("deletes the debt's linked transactions along with it", async () => {
      await service.delete("user-1", "debt-1");

      expect(prisma.transaction.deleteMany).toHaveBeenCalledWith({
        where: { userId: "user-1", debtInstallment: { is: { debtId: "debt-1" } } },
      });
      expect(prisma.debt.delete).toHaveBeenCalledWith({ where: { id: "debt-1" } });
    });

    it("404s for a debt the user doesn't own", async () => {
      prisma.$queryRaw.mockResolvedValue([]);

      await expect(service.delete("user-1", "debt-1")).rejects.toBeInstanceOf(NotFoundException);
      expect(prisma.debt.delete).not.toHaveBeenCalled();
    });
  });
});
