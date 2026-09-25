import { randomUUID } from "crypto";

import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import {
  Prisma,
  type Debt,
  type DebtInstallment,
  type DebtStatus,
  type WorkspaceType,
} from "@prisma/client";

import {
  coversOneCentEach,
  installmentDescription,
  lockDebt,
  recomputeDebt,
  renameLinkedTransactions,
  splitAmount,
} from "../common/debt-sync/debt-sync";
import {
  addMonthsToDateString,
  parseDateOnly,
  toDateOnlyString,
  todayDateOnlyString,
} from "../common/utils/date.util";
import { decimalToString } from "../common/utils/money.util";
import { PrismaService } from "../prisma/prisma.service";

import { CreateDebtDto } from "./dto/create-debt.dto";
import { DebtWithInstallmentsDto } from "./dto/debt-with-installments.dto";
import { DebtDto } from "./dto/debt.dto";
import { PayInstallmentDto } from "./dto/pay-installment.dto";
import { UpdateDebtDto } from "./dto/update-debt.dto";

type DebtWithInstallments = Debt & { installments: DebtInstallment[] };

interface GenerateInstallmentsParams {
  debtId: string;
  userId: string;
  workspace: WorkspaceType;
  name: string;
  totalAmount: Prisma.Decimal;
  totalInstallments: number;
  startDate: string;
  transactionCategoryId: string;
  today: string;
}

// Owns debts, their installments, AND the linked expense transactions
// generated for those installments — it writes those `Transaction` rows
// directly through its own interactive-transaction client rather than
// calling TransactionsService, because TransactionsService's methods
// don't take a transaction client, so going through them would break the
// "installments and their transactions are written atomically" rule.
// The reverse sync (transaction status -> installment) and the shared
// recompute logic live in src/common/debt-sync. See
// docs/specs/debts/design.md "Service layout / module boundary".
@Injectable()
export class DebtsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(userId: string, status?: DebtStatus): Promise<DebtDto[]> {
    const workspace = await this.getActiveWorkspace(userId);
    await this.refreshOverdue({ userId, workspace });

    const debts = await this.prisma.debt.findMany({
      where: { userId, workspace, ...(status ? { status } : {}) },
      orderBy: [{ startDate: "desc" }, { createdAt: "desc" }],
    });
    return debts.map((debt) => this.toDto(debt));
  }

  async findOne(userId: string, id: string): Promise<DebtWithInstallmentsDto> {
    await this.refreshOverdue({ userId, id });

    const debt = await this.prisma.debt.findFirst({
      where: { id, userId },
      include: { installments: { orderBy: { installmentNo: "asc" } } },
    });
    if (!debt) {
      throw new NotFoundException("Debt not found.");
    }
    return this.toDtoWithInstallments(debt);
  }

  async create(userId: string, dto: CreateDebtDto): Promise<DebtWithInstallmentsDto> {
    const workspace = await this.getActiveWorkspace(userId);
    const totalAmount = new Prisma.Decimal(dto.totalAmount);
    this.assertCoversOneCentEach(totalAmount, dto.totalInstallments);
    this.assertEndDateNotBeforeStart(dto.startDate, dto.endDate);

    if (dto.categoryId) {
      await this.validateExpenseCategory(userId, dto.categoryId);
    }
    const transactionCategoryId =
      dto.categoryId ?? (await this.findFallbackExpenseCategoryId(userId));
    const today = todayDateOnlyString();

    return this.prisma.$transaction(async (tx) => {
      const debt = await tx.debt.create({
        data: {
          userId,
          workspace,
          categoryId: dto.categoryId,
          name: dto.name,
          totalAmount,
          startDate: parseDateOnly(dto.startDate),
          endDate: dto.endDate ? parseDateOnly(dto.endDate) : undefined,
          interestRate: dto.interestRate,
          totalInstallments: dto.totalInstallments,
          notes: dto.notes,
        },
      });

      await this.generateInstallments(tx, {
        debtId: debt.id,
        userId,
        workspace,
        name: dto.name,
        totalAmount,
        totalInstallments: dto.totalInstallments,
        startDate: dto.startDate,
        transactionCategoryId,
        today,
      });
      // Past-due installments are created PENDING (legacy-literal, see
      // requirements.md), so a debt started before today is born OVERDUE.
      await recomputeDebt(tx, debt.id, today);

      return this.toDtoWithInstallments(await this.loadWithInstallments(tx, debt.id));
    });
  }

  async update(userId: string, id: string, dto: UpdateDebtDto): Promise<DebtWithInstallmentsDto> {
    if (dto.categoryId) {
      await this.validateExpenseCategory(userId, dto.categoryId);
    }
    const today = todayDateOnlyString();

    return this.prisma.$transaction(async (tx) => {
      // Lock first, then read: every "what changed" decision below comes
      // from the locked row, so two edits landing together can't leave
      // `totalInstallments` out of step with the installments that exist.
      if (!(await lockDebt(tx, id, userId))) {
        throw new NotFoundException("Debt not found.");
      }
      const existing = await tx.debt.findUniqueOrThrow({ where: { id } });

      const existingStartDate = toDateOnlyString(existing.startDate);
      const countChanged =
        dto.totalInstallments !== undefined && dto.totalInstallments !== existing.totalInstallments;
      const startDateChanged = dto.startDate !== undefined && dto.startDate !== existingStartDate;
      const regenerate = countChanged || startDateChanged;

      const name = dto.name ?? existing.name;
      const totalAmount =
        dto.totalAmount !== undefined ? new Prisma.Decimal(dto.totalAmount) : existing.totalAmount;
      const totalAmountChanged = !totalAmount.equals(existing.totalAmount);
      const totalInstallments = dto.totalInstallments ?? existing.totalInstallments;
      const startDate = dto.startDate ?? existingStartDate;
      const endDate =
        dto.endDate === undefined
          ? existing.endDate && toDateOnlyString(existing.endDate)
          : dto.endDate;
      this.assertEndDateNotBeforeStart(startDate, endDate ?? undefined);

      const debtCategoryId = dto.categoryId === undefined ? existing.categoryId : dto.categoryId;
      if (regenerate) {
        this.assertCoversOneCentEach(totalAmount, totalInstallments);
      }
      const transactionCategoryId = regenerate
        ? (debtCategoryId ?? (await this.findFallbackExpenseCategoryId(userId, tx)))
        : null;

      const installments = await tx.debtInstallment.findMany({
        where: { debtId: id },
        orderBy: { installmentNo: "asc" },
      });
      const hasPaid = installments.some((installment) => installment.status === "PAID");

      if (hasPaid && countChanged) {
        throw new BadRequestException(
          "Cannot change the number of installments once some are paid.",
        );
      }
      if (hasPaid && startDateChanged) {
        throw new BadRequestException("Cannot change the start date once some installments are paid.");
      }

      await tx.debt.update({
        where: { id },
        data: {
          name: dto.name,
          totalAmount: dto.totalAmount,
          totalInstallments: dto.totalInstallments,
          startDate: dto.startDate ? parseDateOnly(dto.startDate) : undefined,
          endDate: dto.endDate === undefined ? undefined : dto.endDate && parseDateOnly(dto.endDate),
          interestRate: dto.interestRate,
          categoryId: dto.categoryId,
          notes: dto.notes,
        },
      });

      if (regenerate) {
        // Legacy regenerated installments here but left their old
        // transactions orphaned and never created new ones — both sides
        // are rebuilt together instead (requirements.md).
        await tx.transaction.deleteMany({
          where: { userId, debtInstallment: { is: { debtId: id } } },
        });
        await tx.debtInstallment.deleteMany({ where: { debtId: id } });
        await this.generateInstallments(tx, {
          debtId: id,
          userId,
          workspace: existing.workspace,
          name,
          totalAmount,
          totalInstallments,
          startDate,
          transactionCategoryId: transactionCategoryId!,
          today,
        });
      } else {
        if (totalAmountChanged) {
          await this.recalculatePending(tx, installments, totalAmount);
        }
        if (dto.name !== undefined && dto.name !== existing.name) {
          await renameLinkedTransactions(tx, id, totalInstallments, name);
        }
        if (dto.categoryId && dto.categoryId !== existing.categoryId) {
          await tx.transaction.updateMany({
            where: { userId, debtInstallment: { is: { debtId: id } } },
            data: { categoryId: dto.categoryId },
          });
        }
      }

      await recomputeDebt(tx, id, today);
      return this.toDtoWithInstallments(await this.loadWithInstallments(tx, id));
    });
  }

  async delete(userId: string, id: string): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      if (!(await lockDebt(tx, id, userId))) {
        throw new NotFoundException("Debt not found.");
      }
      // Linked transactions go too (legacy `excluirDivida`); installments
      // cascade with the debt.
      await tx.transaction.deleteMany({
        where: { userId, debtInstallment: { is: { debtId: id } } },
      });
      await tx.debt.delete({ where: { id } });
    });
  }

  async payInstallment(
    userId: string,
    debtId: string,
    installmentId: string,
    dto: PayInstallmentDto,
  ): Promise<DebtWithInstallmentsDto> {
    const today = todayDateOnlyString();
    const paymentDate = parseDateOnly(dto.paymentDate);

    return this.prisma.$transaction(async (tx) => {
      const { debt, installment } = await this.lockAndFindInstallment(
        tx,
        userId,
        debtId,
        installmentId,
      );
      if (installment.status === "PAID") {
        throw new BadRequestException("Installment is already paid.");
      }

      // `updateMany`, not `update`: deleting a transaction from the
      // transactions list doesn't take the debt lock, so the linked row can
      // vanish between our read and this write — then fall through to
      // recreating it instead of failing with a 500.
      let transactionId = installment.transactionId;
      const updatedLinked = transactionId
        ? await tx.transaction.updateMany({
            where: { id: transactionId },
            data: { status: "PAID", date: paymentDate },
          })
        : { count: 0 };
      if (updatedLinked.count === 0) {
        // The linked transaction was deleted from the transactions list
        // (FK is SET NULL) — recreate it, as legacy `pagarParcela` does.
        const created = await tx.transaction.create({
          data: {
            userId,
            categoryId: debt.categoryId ?? (await this.findFallbackExpenseCategoryId(userId, tx)),
            workspace: debt.workspace,
            type: "EXPENSE",
            status: "PAID",
            description: installmentDescription(
              installment.installmentNo,
              debt.totalInstallments,
              debt.name,
            ),
            amount: dto.paidAmount,
            date: paymentDate,
          },
        });
        transactionId = created.id;
      }

      // `amount` is deliberately untouched — paidAmount never overwrites
      // the installment's own amount (matches legacy).
      await tx.debtInstallment.update({
        where: { id: installment.id },
        data: { status: "PAID", paymentDate, transactionId },
      });
      await recomputeDebt(tx, debtId, today);
      return this.toDtoWithInstallments(await this.loadWithInstallments(tx, debtId));
    });
  }

  async cancelPayment(
    userId: string,
    debtId: string,
    installmentId: string,
  ): Promise<DebtWithInstallmentsDto> {
    const today = todayDateOnlyString();

    return this.prisma.$transaction(async (tx) => {
      const { installment } = await this.lockAndFindInstallment(tx, userId, debtId, installmentId);
      if (installment.status !== "PAID") {
        throw new BadRequestException("Installment is not paid.");
      }

      // Reverted to PENDING, never deleted (legacy `cancelarPagamentoParcela`).
      // `updateMany` so a concurrently deleted transaction is a no-op, not
      // a 500 (see payInstallment).
      if (installment.transactionId) {
        await tx.transaction.updateMany({
          where: { id: installment.transactionId },
          data: { status: "PENDING" },
        });
      }
      await tx.debtInstallment.update({
        where: { id: installment.id },
        data: { status: "PENDING", paymentDate: null },
      });
      await recomputeDebt(tx, debtId, today);
      return this.toDtoWithInstallments(await this.loadWithInstallments(tx, debtId));
    });
  }

  private async generateInstallments(
    tx: Prisma.TransactionClient,
    params: GenerateInstallmentsParams,
  ): Promise<void> {
    const amounts = splitAmount(params.totalAmount, params.totalInstallments);
    const transactions: Prisma.TransactionCreateManyInput[] = [];
    const installments: Prisma.DebtInstallmentCreateManyInput[] = [];

    for (let installmentNo = 1; installmentNo <= params.totalInstallments; installmentNo++) {
      const dueDate = addMonthsToDateString(params.startDate, installmentNo - 1);
      const amount = amounts[installmentNo - 1]!;
      // Ids generated here so both batches can be inserted with one
      // `createMany` each (2 queries total, not 2 per installment) while
      // still knowing which transaction belongs to which installment.
      const transactionId = randomUUID();

      transactions.push({
        id: transactionId,
        userId: params.userId,
        categoryId: params.transactionCategoryId,
        workspace: params.workspace,
        type: "EXPENSE",
        // Legacy: an installment due on/before today is assumed already
        // paid on the expense side — the installment itself still starts
        // PENDING (requirements.md, owner-confirmed).
        status: dueDate <= params.today ? "PAID" : "PENDING",
        description: installmentDescription(installmentNo, params.totalInstallments, params.name),
        amount,
        date: parseDateOnly(dueDate),
      });
      installments.push({
        debtId: params.debtId,
        installmentNo,
        amount,
        dueDate: parseDateOnly(dueDate),
        status: "PENDING",
        transactionId,
      });
    }

    await tx.transaction.createMany({ data: transactions });
    await tx.debtInstallment.createMany({ data: installments });
  }

  // (totalAmount - alreadyPaid) spread over the pending installments, to
  // the cent, and mirrored onto their linked transactions. All but the
  // last share one amount, so this is 2 `updateMany` + 2 `update` no
  // matter how many installments are pending.
  private async recalculatePending(
    tx: Prisma.TransactionClient,
    installments: DebtInstallment[],
    totalAmount: Prisma.Decimal,
  ): Promise<void> {
    const pending = installments.filter((installment) => installment.status === "PENDING");
    if (pending.length === 0) {
      throw new BadRequestException(
        "Cannot change the total amount once every installment is paid.",
      );
    }

    const alreadyPaid = installments
      .filter((installment) => installment.status === "PAID")
      .reduce((sum, installment) => sum.plus(installment.amount), new Prisma.Decimal(0));
    const remaining = totalAmount.minus(alreadyPaid);
    if (!coversOneCentEach(remaining, pending.length)) {
      throw new BadRequestException(
        "totalAmount must leave at least 0.01 per pending installment after the amount already paid.",
      );
    }

    const amounts = splitAmount(remaining, pending.length);
    const last = pending[pending.length - 1]!;
    const rest = pending.slice(0, -1);
    const linkedId = (installment: DebtInstallment) => installment.transactionId;

    if (rest.length > 0) {
      const baseAmount = amounts[0]!;
      await tx.debtInstallment.updateMany({
        where: { id: { in: rest.map((installment) => installment.id) } },
        data: { amount: baseAmount },
      });
      const restTransactionIds = rest.map(linkedId).filter((id): id is string => id !== null);
      if (restTransactionIds.length > 0) {
        await tx.transaction.updateMany({
          where: { id: { in: restTransactionIds } },
          data: { amount: baseAmount },
        });
      }
    }

    const lastAmount = amounts[amounts.length - 1]!;
    await tx.debtInstallment.update({ where: { id: last.id }, data: { amount: lastAmount } });
    if (last.transactionId) {
      await tx.transaction.update({
        where: { id: last.transactionId },
        data: { amount: lastAmount },
      });
    }
  }

  // Only ACTIVE -> OVERDUE can happen by time passing alone; every other
  // transition goes through a mutation that already recomputes. Legacy
  // had `verificarStatusDividas` for this but never called it, so its
  // stored status went stale — see requirements.md "Status derivation".
  private async refreshOverdue(scope: {
    userId: string;
    workspace?: WorkspaceType;
    id?: string;
  }): Promise<void> {
    await this.prisma.debt.updateMany({
      where: {
        ...scope,
        status: "ACTIVE",
        installments: {
          some: { status: "PENDING", dueDate: { lt: parseDateOnly(todayDateOnlyString()) } },
        },
      },
      data: { status: "OVERDUE" },
    });
  }

  private async lockAndFindInstallment(
    tx: Prisma.TransactionClient,
    userId: string,
    debtId: string,
    installmentId: string,
  ): Promise<{ debt: Debt; installment: DebtInstallment }> {
    if (!(await lockDebt(tx, debtId, userId))) {
      throw new NotFoundException("Debt not found.");
    }
    const installment = await tx.debtInstallment.findFirst({
      where: { id: installmentId, debtId },
      include: { debt: true },
    });
    if (!installment) {
      throw new NotFoundException("Installment not found.");
    }
    const { debt, ...rest } = installment;
    return { debt, installment: rest };
  }

  private loadWithInstallments(
    client: Prisma.TransactionClient,
    id: string,
  ): Promise<DebtWithInstallments> {
    return client.debt.findUniqueOrThrow({
      where: { id },
      include: { installments: { orderBy: { installmentNo: "asc" } } },
    });
  }

  private async getActiveWorkspace(userId: string): Promise<WorkspaceType> {
    // Fetched fresh rather than trusted from the JWT claim — see the
    // matching note in TransactionsService.
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { activeWorkspace: true },
    });
    return user.activeWorkspace;
  }

  // Linked transactions are expenses, so the debt's category has to be an
  // expense category too (legacy never checked, but Transaction would
  // then carry an income category on an expense row).
  private async validateExpenseCategory(userId: string, categoryId: string): Promise<void> {
    const category = await this.prisma.category.findFirst({ where: { id: categoryId, userId } });
    if (!category) {
      throw new NotFoundException("Category not found.");
    }
    if (category.type !== "EXPENSE") {
      throw new BadRequestException("categoryId must be an EXPENSE category.");
    }
  }

  // Legacy `obterCategoriaDefaultDespesa()`: the user's oldest expense
  // category. Legacy fell back to a global system category next — there
  // are no global categories in the rebuild, so no category at all is a
  // 400 (a Transaction can't exist without one).
  private async findFallbackExpenseCategoryId(
    userId: string,
    client: Prisma.TransactionClient = this.prisma,
  ): Promise<string> {
    const category = await client.category.findFirst({
      where: { userId, type: "EXPENSE" },
      orderBy: { createdAt: "asc" },
      select: { id: true },
    });
    if (!category) {
      throw new BadRequestException(
        "No expense category available — create one or provide categoryId.",
      );
    }
    return category.id;
  }

  private assertCoversOneCentEach(totalAmount: Prisma.Decimal, totalInstallments: number): void {
    if (!coversOneCentEach(totalAmount, totalInstallments)) {
      throw new BadRequestException("totalAmount must give every installment at least 0.01.");
    }
  }

  private assertEndDateNotBeforeStart(startDate: string, endDate?: string | null): void {
    if (endDate && endDate < startDate) {
      throw new BadRequestException("endDate must not be before startDate.");
    }
  }

  private toDto(debt: Debt): DebtDto {
    return {
      id: debt.id,
      workspace: debt.workspace,
      categoryId: debt.categoryId,
      name: debt.name,
      totalAmount: decimalToString(debt.totalAmount),
      paidAmount: decimalToString(debt.paidAmount),
      remainingAmount: decimalToString(debt.totalAmount.minus(debt.paidAmount)),
      startDate: toDateOnlyString(debt.startDate),
      endDate: debt.endDate ? toDateOnlyString(debt.endDate) : null,
      interestRate: debt.interestRate ? debt.interestRate.toFixed(2) : null,
      totalInstallments: debt.totalInstallments,
      paidInstallments: debt.paidInstallments,
      notes: debt.notes,
      status: debt.status,
      createdAt: debt.createdAt.toISOString(),
      updatedAt: debt.updatedAt.toISOString(),
    };
  }

  private toDtoWithInstallments(debt: DebtWithInstallments): DebtWithInstallmentsDto {
    return {
      ...this.toDto(debt),
      installments: debt.installments.map((installment) => ({
        id: installment.id,
        installmentNo: installment.installmentNo,
        amount: decimalToString(installment.amount),
        dueDate: toDateOnlyString(installment.dueDate),
        status: installment.status,
        paymentDate: installment.paymentDate ? toDateOnlyString(installment.paymentDate) : null,
        transactionId: installment.transactionId,
      })),
    };
  }
}
