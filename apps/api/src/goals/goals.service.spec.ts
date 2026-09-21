import { NotFoundException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { Prisma } from "@prisma/client";

import { PrismaService } from "../prisma/prisma.service";

import { CreateGoalDto } from "./dto/create-goal.dto";
import { GoalsService } from "./goals.service";

describe("GoalsService", () => {
  let service: GoalsService;
  let prisma: {
    goal: {
      findMany: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
      findFirst: jest.Mock;
    };
    category: { findFirst: jest.Mock };
    user: { findUniqueOrThrow: jest.Mock };
  };

  const buildGoal = (overrides: Partial<Record<string, unknown>> = {}) => ({
    id: "goal-1",
    userId: "user-1",
    workspace: "PERSONAL",
    categoryId: null,
    title: "Viagem",
    description: null,
    targetAmount: new Prisma.Decimal("5000"),
    currentAmount: new Prisma.Decimal("0"),
    targetDate: null,
    completed: false,
    createdAt: new Date("2026-01-15T12:00:00.000Z"),
    updatedAt: new Date("2026-01-15T12:00:00.000Z"),
    ...overrides,
  });

  beforeEach(async () => {
    prisma = {
      goal: {
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        findFirst: jest.fn(),
      },
      category: { findFirst: jest.fn() },
      user: {
        findUniqueOrThrow: jest.fn().mockResolvedValue({ activeWorkspace: "PERSONAL" }),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [GoalsService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get(GoalsService);
  });

  describe("list", () => {
    it("lists goals scoped to the active workspace", async () => {
      prisma.goal.findMany.mockResolvedValue([buildGoal()]);

      await service.list("user-1");

      expect(prisma.goal.findMany).toHaveBeenCalledWith({
        where: { userId: "user-1", workspace: "PERSONAL" },
        orderBy: { createdAt: "desc" },
      });
    });

    it("filters by completed when provided", async () => {
      prisma.goal.findMany.mockResolvedValue([]);

      await service.list("user-1", true);

      expect(prisma.goal.findMany).toHaveBeenCalledWith({
        where: { userId: "user-1", workspace: "PERSONAL", completed: true },
        orderBy: { createdAt: "desc" },
      });
    });
  });

  describe("create", () => {
    const dto: CreateGoalDto = { title: "Viagem", targetAmount: 5000 };

    it("defaults currentAmount to 0", async () => {
      prisma.goal.create.mockResolvedValue(buildGoal());

      await service.create("user-1", dto);

      expect(prisma.goal.create.mock.calls[0][0].data.currentAmount).toBe(0);
    });

    it("rejects when categoryId doesn't belong to the user", async () => {
      prisma.category.findFirst.mockResolvedValue(null);

      await expect(
        service.create("user-1", { ...dto, categoryId: "cat-1" }),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(prisma.goal.create).not.toHaveBeenCalled();
    });
  });

  describe("update", () => {
    it("updates currentAmount independently of completed", async () => {
      prisma.goal.findFirst.mockResolvedValue(buildGoal());
      prisma.goal.update.mockResolvedValue(
        buildGoal({ currentAmount: new Prisma.Decimal("2500") }),
      );

      const result = await service.update("user-1", "goal-1", { currentAmount: 2500 });

      expect(prisma.goal.update).toHaveBeenCalledWith({
        where: { id: "goal-1" },
        data: {
          title: undefined,
          description: undefined,
          targetAmount: undefined,
          currentAmount: 2500,
          targetDate: undefined,
          categoryId: undefined,
          completed: undefined,
        },
      });
      expect(result.completed).toBe(false);
    });

    it("fills currentAmount to targetAmount when marking completed", async () => {
      prisma.goal.findFirst.mockResolvedValue(
        buildGoal({
          targetAmount: new Prisma.Decimal("1000"),
          currentAmount: new Prisma.Decimal("300"),
        }),
      );
      prisma.goal.update.mockResolvedValue(
        buildGoal({
          targetAmount: new Prisma.Decimal("1000"),
          currentAmount: new Prisma.Decimal("1000"),
          completed: true,
        }),
      );

      const result = await service.update("user-1", "goal-1", { completed: true });

      expect(prisma.goal.update).toHaveBeenCalledWith({
        where: { id: "goal-1" },
        data: expect.objectContaining({ currentAmount: 1000, completed: true }),
      });
      expect(result.progressPercent).toBe(100);
    });

    it("uses the newly-submitted targetAmount, not the stored one, when both change together", async () => {
      prisma.goal.findFirst.mockResolvedValue(
        buildGoal({ targetAmount: new Prisma.Decimal("1000") }),
      );
      prisma.goal.update.mockResolvedValue(buildGoal({ completed: true }));

      await service.update("user-1", "goal-1", { completed: true, targetAmount: 2000 });

      expect(prisma.goal.update).toHaveBeenCalledWith({
        where: { id: "goal-1" },
        data: expect.objectContaining({ currentAmount: 2000, targetAmount: 2000 }),
      });
    });

    it("does not touch currentAmount when completed is unset or false", async () => {
      prisma.goal.findFirst.mockResolvedValue(buildGoal());
      prisma.goal.update.mockResolvedValue(buildGoal({ title: "Novo título" }));

      await service.update("user-1", "goal-1", { title: "Novo título" });

      expect(prisma.goal.update).toHaveBeenCalledWith({
        where: { id: "goal-1" },
        data: expect.objectContaining({ currentAmount: undefined }),
      });
    });

    it("rejects with 404 when the goal isn't owned by the user", async () => {
      prisma.goal.findFirst.mockResolvedValue(null);

      await expect(
        service.update("user-1", "goal-1", { title: "x" }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe("delete", () => {
    it("deletes a goal the user owns", async () => {
      prisma.goal.findFirst.mockResolvedValue(buildGoal());

      await service.delete("user-1", "goal-1");

      expect(prisma.goal.delete).toHaveBeenCalledWith({ where: { id: "goal-1" } });
    });

    it("rejects with 404 when the goal isn't owned by the user", async () => {
      prisma.goal.findFirst.mockResolvedValue(null);

      await expect(service.delete("user-1", "goal-1")).rejects.toBeInstanceOf(NotFoundException);
      expect(prisma.goal.delete).not.toHaveBeenCalled();
    });
  });

  describe("progressPercent", () => {
    it("computes the percentage of target reached", async () => {
      prisma.goal.findMany.mockResolvedValue([
        buildGoal({
          targetAmount: new Prisma.Decimal("1000"),
          currentAmount: new Prisma.Decimal("300"),
        }),
      ]);

      const [goal] = await service.list("user-1");

      expect(goal!.progressPercent).toBe(30);
    });

    it("clamps at 100 when currentAmount exceeds targetAmount", async () => {
      prisma.goal.findMany.mockResolvedValue([
        buildGoal({
          targetAmount: new Prisma.Decimal("1000"),
          currentAmount: new Prisma.Decimal("1500"),
        }),
      ]);

      const [goal] = await service.list("user-1");

      expect(goal!.progressPercent).toBe(100);
    });

    it("is 0 when targetAmount is 0 (avoids division by zero)", async () => {
      prisma.goal.findMany.mockResolvedValue([
        buildGoal({
          targetAmount: new Prisma.Decimal("0"),
          currentAmount: new Prisma.Decimal("0"),
        }),
      ]);

      const [goal] = await service.list("user-1");

      expect(goal!.progressPercent).toBe(0);
    });
  });
});
