import { BadRequestException, NotFoundException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";

import { PrismaService } from "../prisma/prisma.service";

import { CategoriesService } from "./categories.service";
import { CreateCategoryDto } from "./dto/create-category.dto";
import { UpdateCategoryDto } from "./dto/update-category.dto";

describe("CategoriesService", () => {
  let service: CategoriesService;
  let prisma: {
    category: {
      findMany: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
      findFirst: jest.Mock;
    };
    transaction: {
      count: jest.Mock;
      updateMany: jest.Mock;
    };
    debt: { updateMany: jest.Mock };
    $transaction: jest.Mock;
  };

  const buildCategory = (overrides: Partial<Record<string, unknown>> = {}) => ({
    id: "cat-1",
    userId: "user-1",
    name: "Alimentação",
    type: "EXPENSE",
    color: "#3B82F6",
    icon: "restaurant-outline",
    createdAt: new Date("2026-01-15T12:00:00.000Z"),
    ...overrides,
  });

  beforeEach(async () => {
    prisma = {
      category: {
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        findFirst: jest.fn(),
      },
      transaction: {
        count: jest.fn().mockResolvedValue(0),
        updateMany: jest.fn(),
      },
      debt: { updateMany: jest.fn() },
      $transaction: jest.fn((ops: Promise<unknown>[]) => Promise.all(ops)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [CategoriesService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get(CategoriesService);
  });

  describe("list", () => {
    it("lists only the user's own categories, sorted by name", async () => {
      prisma.category.findMany.mockResolvedValue([buildCategory()]);

      const result = await service.list("user-1");

      expect(prisma.category.findMany).toHaveBeenCalledWith({
        where: { userId: "user-1" },
        orderBy: { name: "asc" },
      });
      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({ id: "cat-1", name: "Alimentação" });
    });

    it("filters by type when provided", async () => {
      prisma.category.findMany.mockResolvedValue([]);

      await service.list("user-1", "INCOME");

      expect(prisma.category.findMany).toHaveBeenCalledWith({
        where: { userId: "user-1", type: "INCOME" },
        orderBy: { name: "asc" },
      });
    });
  });

  describe("create", () => {
    const dto: CreateCategoryDto = {
      name: "Salário",
      type: "INCOME",
      icon: "cash-outline",
    };

    it("creates a category with the given color", async () => {
      prisma.category.create.mockResolvedValue(
        buildCategory({ name: "Salário", type: "INCOME", icon: "cash-outline", color: "#FF0000" }),
      );

      await service.create("user-1", { ...dto, color: "#FF0000" });

      expect(prisma.category.create).toHaveBeenCalledWith({
        data: { userId: "user-1", name: "Salário", type: "INCOME", color: "#FF0000", icon: "cash-outline" },
      });
    });

    it("assigns a random color when none is given", async () => {
      prisma.category.create.mockResolvedValue(buildCategory());

      await service.create("user-1", dto);

      const createArgs = prisma.category.create.mock.calls[0][0];
      expect(createArgs.data.color).toMatch(/^#[0-9A-Fa-f]{6}$/);
    });
  });

  describe("update", () => {
    const dto: UpdateCategoryDto = { name: "Novo nome" };

    it("updates a category the user owns", async () => {
      prisma.category.findFirst.mockResolvedValue(buildCategory());
      prisma.category.update.mockResolvedValue(buildCategory({ name: "Novo nome" }));

      const result = await service.update("user-1", "cat-1", dto);

      expect(prisma.category.findFirst).toHaveBeenCalledWith({
        where: { id: "cat-1", userId: "user-1" },
      });
      expect(result.name).toBe("Novo nome");
    });

    it("rejects with 404 when the category isn't owned by the user", async () => {
      prisma.category.findFirst.mockResolvedValue(null);

      await expect(service.update("user-1", "cat-1", dto)).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(prisma.category.update).not.toHaveBeenCalled();
    });
  });

  describe("delete", () => {
    it("deletes a category the user owns, without a replacement", async () => {
      prisma.category.findFirst.mockResolvedValue(buildCategory());

      await service.delete("user-1", "cat-1");

      expect(prisma.category.delete).toHaveBeenCalledWith({ where: { id: "cat-1" } });
    });

    it("validates the replacement category is owned by the user, reassigns transactions and debts, then deletes", async () => {
      prisma.category.findFirst
        .mockResolvedValueOnce(buildCategory({ id: "cat-1" }))
        .mockResolvedValueOnce(buildCategory({ id: "cat-2" }));

      await service.delete("user-1", "cat-1", "cat-2");

      expect(prisma.category.findFirst).toHaveBeenNthCalledWith(1, {
        where: { id: "cat-1", userId: "user-1" },
      });
      expect(prisma.category.findFirst).toHaveBeenNthCalledWith(2, {
        where: { id: "cat-2", userId: "user-1" },
      });
      expect(prisma.transaction.updateMany).toHaveBeenCalledWith({
        where: { categoryId: "cat-1", userId: "user-1" },
        data: { categoryId: "cat-2" },
      });
      expect(prisma.debt.updateMany).toHaveBeenCalledWith({
        where: { categoryId: "cat-1", userId: "user-1" },
        data: { categoryId: "cat-2" },
      });
      expect(prisma.category.delete).toHaveBeenCalledWith({ where: { id: "cat-1" } });
      expect(prisma.$transaction).toHaveBeenCalled();
    });

    it("rejects with 400 when the category has transactions and no replacement is given", async () => {
      prisma.category.findFirst.mockResolvedValue(buildCategory());
      prisma.transaction.count.mockResolvedValue(3);

      await expect(service.delete("user-1", "cat-1")).rejects.toBeInstanceOf(
        BadRequestException,
      );
      expect(prisma.category.delete).not.toHaveBeenCalled();
    });

    it("rejects with 404 when the category doesn't belong to the user", async () => {
      prisma.category.findFirst.mockResolvedValue(null);

      await expect(service.delete("user-1", "cat-1")).rejects.toBeInstanceOf(NotFoundException);
      expect(prisma.category.delete).not.toHaveBeenCalled();
    });

    it("rejects with 404 when the replacement category doesn't belong to the user", async () => {
      prisma.category.findFirst
        .mockResolvedValueOnce(buildCategory({ id: "cat-1" }))
        .mockResolvedValueOnce(null);

      await expect(service.delete("user-1", "cat-1", "cat-2")).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(prisma.category.delete).not.toHaveBeenCalled();
    });

    it("rejects with 400 when the replacement is the category being deleted", async () => {
      prisma.category.findFirst.mockResolvedValue(buildCategory({ id: "cat-1" }));

      await expect(service.delete("user-1", "cat-1", "cat-1")).rejects.toBeInstanceOf(
        BadRequestException,
      );
      expect(prisma.category.delete).not.toHaveBeenCalled();
    });

    it("rejects with 400 when the replacement has a different type", async () => {
      prisma.category.findFirst
        .mockResolvedValueOnce(buildCategory({ id: "cat-1", type: "EXPENSE" }))
        .mockResolvedValueOnce(buildCategory({ id: "cat-2", type: "INCOME" }));

      await expect(service.delete("user-1", "cat-1", "cat-2")).rejects.toBeInstanceOf(
        BadRequestException,
      );
      expect(prisma.category.delete).not.toHaveBeenCalled();
    });
  });
});
