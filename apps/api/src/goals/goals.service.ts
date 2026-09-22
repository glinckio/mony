import { Injectable, NotFoundException } from "@nestjs/common";
import type { Goal, WorkspaceType } from "@prisma/client";

import { parseDateOnly, toDateOnlyString } from "../common/utils/date.util";
import { decimalToString } from "../common/utils/money.util";
import { PrismaService } from "../prisma/prisma.service";

import { CreateGoalDto } from "./dto/create-goal.dto";
import { GoalDto } from "./dto/goal.dto";
import { UpdateGoalDto } from "./dto/update-goal.dto";

@Injectable()
export class GoalsService {
  constructor(private readonly prisma: PrismaService) {}

  // `workspace` is optional and only meant for a caller (e.g.
  // DashboardService) that already resolved it this request — avoids a
  // redundant `user.findUniqueOrThrow` round trip. Callers outside a
  // single request (e.g. the controller) omit it and get it fetched
  // fresh, same as before.
  async list(userId: string, completed?: boolean, workspace?: WorkspaceType): Promise<GoalDto[]> {
    workspace ??= await this.getActiveWorkspace(userId);
    const goals = await this.prisma.goal.findMany({
      where: { userId, workspace, ...(completed !== undefined ? { completed } : {}) },
      orderBy: { createdAt: "desc" },
    });
    return goals.map((goal) => this.toDto(goal));
  }

  async create(userId: string, dto: CreateGoalDto): Promise<GoalDto> {
    const workspace = await this.getActiveWorkspace(userId);
    if (dto.categoryId) {
      await this.validateCategory(userId, dto.categoryId);
    }

    const goal = await this.prisma.goal.create({
      data: {
        userId,
        workspace,
        categoryId: dto.categoryId,
        title: dto.title,
        description: dto.description,
        targetAmount: dto.targetAmount,
        currentAmount: dto.currentAmount ?? 0,
        targetDate: dto.targetDate ? parseDateOnly(dto.targetDate) : undefined,
      },
    });
    return this.toDto(goal);
  }

  async update(userId: string, id: string, dto: UpdateGoalDto): Promise<GoalDto> {
    const existing = await this.findOwned(userId, id);
    if (dto.categoryId) {
      await this.validateCategory(userId, dto.categoryId);
    }

    // Marking a goal completed fills the progress bar to 100%, even if
    // the client didn't also send currentAmount in the same request —
    // a completed goal should always read as fully funded. This is a
    // deliberate product decision (the user explicitly asked for it),
    // not a legacy-parity rule — legacy kept `concluida` fully
    // independent of `valor_atual`.
    const currentAmount =
      dto.completed === true
        ? (dto.targetAmount ?? existing.targetAmount.toNumber())
        : dto.currentAmount;

    const goal = await this.prisma.goal.update({
      where: { id },
      data: {
        title: dto.title,
        description: dto.description,
        targetAmount: dto.targetAmount,
        currentAmount,
        targetDate: dto.targetDate ? parseDateOnly(dto.targetDate) : undefined,
        categoryId: dto.categoryId,
        completed: dto.completed,
      },
    });
    return this.toDto(goal);
  }

  async delete(userId: string, id: string): Promise<void> {
    // No dependency checks — nothing else references a Goal, per
    // design.md.
    await this.findOwned(userId, id);
    await this.prisma.goal.delete({ where: { id } });
  }

  private async getActiveWorkspace(userId: string): Promise<WorkspaceType> {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { activeWorkspace: true },
    });
    return user.activeWorkspace;
  }

  private async validateCategory(userId: string, categoryId: string): Promise<void> {
    const category = await this.prisma.category.findFirst({ where: { id: categoryId, userId } });
    if (!category) {
      throw new NotFoundException("Category not found.");
    }
  }

  private async findOwned(userId: string, id: string): Promise<Goal> {
    const goal = await this.prisma.goal.findFirst({ where: { id, userId } });
    if (!goal) {
      throw new NotFoundException("Goal not found.");
    }
    return goal;
  }

  private toDto(goal: Goal): GoalDto {
    const progressPercent = goal.targetAmount.isZero()
      ? 0
      : Math.min(
          100,
          Math.max(0, goal.currentAmount.dividedBy(goal.targetAmount).times(100).toNumber()),
        );

    return {
      id: goal.id,
      workspace: goal.workspace,
      categoryId: goal.categoryId,
      title: goal.title,
      description: goal.description,
      targetAmount: decimalToString(goal.targetAmount),
      currentAmount: decimalToString(goal.currentAmount),
      targetDate: goal.targetDate ? toDateOnlyString(goal.targetDate) : null,
      completed: goal.completed,
      progressPercent,
      createdAt: goal.createdAt.toISOString(),
      updatedAt: goal.updatedAt.toISOString(),
    };
  }
}
