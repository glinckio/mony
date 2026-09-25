import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma, type Transaction, type WorkspaceType } from "@prisma/client";

import { syncInstallmentFromTransactionStatus } from "../common/debt-sync/debt-sync";
import {
  addMonthsToDateString,
  parseDateOnly,
  toDateOnlyString,
  todayDateOnlyString,
} from "../common/utils/date.util";
import { decimalToString } from "../common/utils/money.util";
import { PrismaService } from "../prisma/prisma.service";

import { BulkDeleteTransactionsDto } from "./dto/bulk-delete-transactions.dto";
import { CreateTransactionDto } from "./dto/create-transaction.dto";
import { ListTransactionsQueryDto } from "./dto/list-transactions-query.dto";
import { PaginatedTransactionsDto } from "./dto/paginated-transactions.dto";
import { TransactionSummaryDto } from "./dto/transaction-summary.dto";
import { TransactionDto } from "./dto/transaction.dto";
import { UpdateTransactionStatusDto } from "./dto/update-transaction-status.dto";
import { UpdateTransactionDto } from "./dto/update-transaction.dto";

@Injectable()
export class TransactionsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(userId: string, query: ListTransactionsQueryDto): Promise<PaginatedTransactionsDto> {
    const workspace = await this.getActiveWorkspace(userId);

    const where: Prisma.TransactionWhereInput = {
      userId,
      workspace,
      ...(query.type ? { type: query.type } : {}),
      ...(query.categoryId ? { categoryId: query.categoryId } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.dateFrom || query.dateTo
        ? {
            date: {
              ...(query.dateFrom ? { gte: parseDateOnly(query.dateFrom) } : {}),
              ...(query.dateTo ? { lte: parseDateOnly(query.dateTo) } : {}),
            },
          }
        : {}),
      ...(query.search ? { description: { contains: query.search, mode: "insensitive" } } : {}),
    };

    const sortBy = query.sortBy ?? "date";
    const sortOrder = query.sortOrder ?? "desc";

    const [items, total] = await this.prisma.$transaction([
      this.prisma.transaction.findMany({
        where,
        orderBy: { [sortBy]: sortOrder },
        skip: (query.page - 1) * query.perPage,
        take: query.perPage,
      }),
      this.prisma.transaction.count({ where }),
    ]);

    return {
      items: items.map((transaction) => this.toDto(transaction)),
      total,
      page: query.page,
      perPage: query.perPage,
    };
  }

  async create(userId: string, dto: CreateTransactionDto): Promise<TransactionDto | TransactionDto[]> {
    const workspace = await this.getActiveWorkspace(userId);
    await this.validateCategory(userId, dto.categoryId, dto.type);

    const initialStatus = dto.type === "INCOME" ? "PAID" : (dto.status ?? "PENDING");

    if (dto.recurring && dto.recurringMonths && dto.recurringMonths > 1) {
      const rows: Prisma.TransactionCreateManyInput[] = [];
      for (let i = 0; i < dto.recurringMonths; i++) {
        const isFirst = i === 0;
        rows.push({
          userId,
          categoryId: dto.categoryId,
          workspace,
          type: dto.type,
          status: isFirst ? initialStatus : dto.type === "EXPENSE" ? "PENDING" : "PAID",
          description: isFirst
            ? dto.description
            : `${dto.description} (${i + 1}/${dto.recurringMonths})`,
          amount: dto.amount,
          date: parseDateOnly(addMonthsToDateString(dto.date, i)),
          recurring: isFirst,
        });
      }

      const created = await this.prisma.$transaction(
        rows.map((data) => this.prisma.transaction.create({ data })),
      );
      return created.map((transaction) => this.toDto(transaction));
    }

    const transaction = await this.prisma.transaction.create({
      data: {
        userId,
        categoryId: dto.categoryId,
        workspace,
        type: dto.type,
        status: initialStatus,
        description: dto.description,
        amount: dto.amount,
        date: parseDateOnly(dto.date),
        recurring: dto.recurring ?? false,
      },
    });
    return this.toDto(transaction);
  }

  async update(userId: string, id: string, dto: UpdateTransactionDto): Promise<TransactionDto> {
    const existing = await this.findOwned(userId, id);

    if (dto.categoryId) {
      await this.validateCategory(userId, dto.categoryId, existing.type);
    }

    const transaction = await this.prisma.transaction.update({
      where: { id },
      data: {
        categoryId: dto.categoryId,
        description: dto.description,
        amount: dto.amount,
        date: dto.date ? parseDateOnly(dto.date) : undefined,
      },
    });
    return this.toDto(transaction);
  }

  async updateStatus(
    userId: string,
    id: string,
    dto: UpdateTransactionStatusDto,
  ): Promise<TransactionDto> {
    const existing = await this.prisma.transaction.findFirst({
      where: { id, userId },
      include: { debtInstallment: { select: { id: true } } },
    });
    if (!existing) {
      throw new NotFoundException("Transaction not found.");
    }
    if (existing.type !== "EXPENSE") {
      throw new BadRequestException("Only expenses can have their status changed.");
    }

    // Not linked to a debt installment — and it can't become linked later:
    // installments only ever link transactions created alongside them — so
    // no debt sync and no interactive transaction on this (common) path.
    if (!existing.debtInstallment) {
      const transaction = await this.prisma.transaction.update({
        where: { id },
        data: { status: dto.status },
      });
      return this.toDto(transaction);
    }

    // A transaction generated for a debt installment pays/unpays that
    // installment too, atomically — legacy `atualizarStatusTransacao`,
    // see docs/specs/debts/requirements.md. The sync (which row-locks the
    // debt) runs BEFORE the transaction row is written: DebtsService
    // always locks the debt first and then writes its linked transactions,
    // so the opposite order here could deadlock against a concurrent
    // pay/cancel of the same installment.
    const transaction = await this.prisma.$transaction(async (tx) => {
      await syncInstallmentFromTransactionStatus(tx, id, dto.status, todayDateOnlyString());
      return tx.transaction.update({
        where: { id },
        data: { status: dto.status },
      });
    });
    return this.toDto(transaction);
  }

  async delete(userId: string, id: string): Promise<void> {
    await this.findOwned(userId, id);
    await this.prisma.transaction.delete({ where: { id } });
  }

  async bulkDelete(userId: string, dto: BulkDeleteTransactionsDto): Promise<void> {
    const owned = await this.prisma.transaction.count({
      where: { id: { in: dto.ids }, userId },
    });
    if (owned !== dto.ids.length) {
      throw new BadRequestException("One or more transactions not found or not owned by you.");
    }

    await this.prisma.transaction.deleteMany({ where: { id: { in: dto.ids }, userId } });
  }

  // `workspace` is optional and only meant for a caller (e.g.
  // DashboardService) that already resolved it this request — avoids a
  // redundant `user.findUniqueOrThrow` round trip. Callers outside a
  // single request (e.g. the controller) omit it and get it fetched
  // fresh, same as before.
  async summary(
    userId: string,
    dateFrom: string,
    dateTo: string,
    workspace?: WorkspaceType,
  ): Promise<TransactionSummaryDto> {
    workspace ??= await this.getActiveWorkspace(userId);
    const date = { gte: parseDateOnly(dateFrom), lte: parseDateOnly(dateTo) };

    const [incomeAgg, expensesPaidAgg, expensesPendingAgg] = await Promise.all([
      this.prisma.transaction.aggregate({
        where: { userId, workspace, type: "INCOME", date },
        _sum: { amount: true },
      }),
      this.prisma.transaction.aggregate({
        where: { userId, workspace, type: "EXPENSE", status: "PAID", date },
        _sum: { amount: true },
      }),
      this.prisma.transaction.aggregate({
        where: { userId, workspace, type: "EXPENSE", status: "PENDING", date },
        _sum: { amount: true },
      }),
    ]);

    const totalIncome = incomeAgg._sum.amount ?? new Prisma.Decimal(0);
    const totalExpensesPaid = expensesPaidAgg._sum.amount ?? new Prisma.Decimal(0);
    const balance = totalIncome.sub(totalExpensesPaid);

    return {
      totalIncome: decimalToString(totalIncome),
      totalExpensesPaid: decimalToString(totalExpensesPaid),
      totalExpensesPending: decimalToString(expensesPendingAgg._sum.amount),
      balance: decimalToString(balance),
    };
  }

  private async getActiveWorkspace(userId: string): Promise<WorkspaceType> {
    // Fetched fresh from the DB rather than trusting the JWT's
    // `activeWorkspace` claim — unlike cosmetic UI labels, which
    // workspace's data this scopes to is correctness-critical, and the
    // claim can be stale for up to the access token's TTL after a
    // switch (see docs/specs/user-profile/design.md).
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { activeWorkspace: true },
    });
    return user.activeWorkspace;
  }

  private async validateCategory(
    userId: string,
    categoryId: string,
    type: "INCOME" | "EXPENSE",
  ): Promise<void> {
    const category = await this.prisma.category.findFirst({ where: { id: categoryId, userId } });
    if (!category) {
      throw new NotFoundException("Category not found.");
    }
    if (category.type !== type) {
      throw new BadRequestException("categoryId must match the transaction's type.");
    }
  }

  private async findOwned(userId: string, id: string): Promise<Transaction> {
    const transaction = await this.prisma.transaction.findFirst({ where: { id, userId } });
    if (!transaction) {
      throw new NotFoundException("Transaction not found.");
    }
    return transaction;
  }

  private toDto(transaction: Transaction): TransactionDto {
    return {
      id: transaction.id,
      categoryId: transaction.categoryId,
      workspace: transaction.workspace,
      type: transaction.type,
      status: transaction.status,
      description: transaction.description,
      amount: decimalToString(transaction.amount),
      date: toDateOnlyString(transaction.date),
      recurring: transaction.recurring,
      createdAt: transaction.createdAt.toISOString(),
      updatedAt: transaction.updatedAt.toISOString(),
    };
  }
}
