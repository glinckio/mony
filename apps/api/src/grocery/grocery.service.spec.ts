import { NotFoundException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { Prisma } from "@prisma/client";

import { PrismaService } from "../prisma/prisma.service";

import { GroceryService } from "./grocery.service";

const d = (value: string) => new Prisma.Decimal(value);

describe("GroceryService", () => {
  let service: GroceryService;
  let prisma: {
    groceryItem: {
      findMany: jest.Mock;
      findFirst: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
    };
    groceryBudget: { findFirst: jest.Mock; create: jest.Mock; update: jest.Mock };
  };

  const buildItem = (overrides: Partial<Record<string, unknown>> = {}) => ({
    id: "item-1",
    userId: "user-1",
    name: "Arroz",
    unit: "kg",
    idealQuantity: d("5"),
    currentQuantity: d("1.5"),
    estimatedPrice: d("6.49"),
    category: "PANTRY",
    createdAt: new Date("2026-09-25T12:00:00.000Z"),
    updatedAt: new Date("2026-09-25T12:00:00.000Z"),
    ...overrides,
  });

  beforeEach(async () => {
    prisma = {
      groceryItem: {
        findMany: jest.fn().mockResolvedValue([]),
        findFirst: jest.fn().mockResolvedValue(buildItem()),
        create: jest.fn().mockResolvedValue(buildItem()),
        update: jest.fn().mockResolvedValue(buildItem()),
        delete: jest.fn(),
      },
      groceryBudget: { findFirst: jest.fn(), create: jest.fn(), update: jest.fn() },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [GroceryService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get(GroceryService);
  });

  describe("items", () => {
    it("lists only the user's items, ordered by category then name", async () => {
      prisma.groceryItem.findMany.mockResolvedValue([buildItem()]);

      const [item] = await service.listItems("user-1");

      expect(prisma.groceryItem.findMany).toHaveBeenCalledWith({
        where: { userId: "user-1" },
        orderBy: [{ category: "asc" }, { name: "asc" }],
      });
      expect(item).toMatchObject({
        idealQuantity: "5.00",
        currentQuantity: "1.50",
        estimatedPrice: "6.49",
        missing: true,
      });
    });

    it("isn't missing when current meets or exceeds ideal", async () => {
      prisma.groceryItem.findMany.mockResolvedValue([
        buildItem({ currentQuantity: d("5") }),
        buildItem({ id: "item-2", currentQuantity: d("7") }),
      ]);

      const items = await service.listItems("user-1");

      expect(items.map((item) => item.missing)).toEqual([false, false]);
    });

    it("defaults currentQuantity to 0 on create", async () => {
      await service.createItem("user-1", {
        name: "Arroz",
        unit: "kg",
        idealQuantity: 5,
        estimatedPrice: 6.49,
        category: "PANTRY",
      });

      expect(prisma.groceryItem.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ userId: "user-1", currentQuantity: 0 }),
      });
    });

    it("keeps an explicit currentQuantity on create and returns the mapped item", async () => {
      prisma.groceryItem.create.mockResolvedValue(
        buildItem({ currentQuantity: d("5"), idealQuantity: d("5") }),
      );

      const item = await service.createItem("user-1", {
        name: "Arroz",
        unit: "kg",
        idealQuantity: 5,
        currentQuantity: 5,
        estimatedPrice: 6.49,
        category: "PANTRY",
      });

      expect(prisma.groceryItem.create).toHaveBeenCalledWith({
        data: {
          userId: "user-1",
          name: "Arroz",
          unit: "kg",
          idealQuantity: 5,
          currentQuantity: 5,
          estimatedPrice: 6.49,
          category: "PANTRY",
        },
      });
      expect(item).toMatchObject({ currentQuantity: "5.00", missing: false });
    });

    it("deletes an owned item after checking ownership", async () => {
      await service.deleteItem("user-1", "item-1");

      expect(prisma.groceryItem.findFirst).toHaveBeenCalledWith({
        where: { id: "item-1", userId: "user-1" },
      });
      expect(prisma.groceryItem.delete).toHaveBeenCalledWith({ where: { id: "item-1" } });
    });

    it("updates only the fields sent (quick stepper sends just currentQuantity)", async () => {
      await service.updateItem("user-1", "item-1", { currentQuantity: 3 });

      expect(prisma.groceryItem.findFirst).toHaveBeenCalledWith({
        where: { id: "item-1", userId: "user-1" },
      });
      expect(prisma.groceryItem.update).toHaveBeenCalledWith({
        where: { id: "item-1" },
        data: {
          name: undefined,
          unit: undefined,
          idealQuantity: undefined,
          currentQuantity: 3,
          estimatedPrice: undefined,
          category: undefined,
        },
      });
    });

    it("404s updating or deleting another user's item", async () => {
      prisma.groceryItem.findFirst.mockResolvedValue(null);

      await expect(service.updateItem("user-1", "item-x", { name: "X" })).rejects.toBeInstanceOf(
        NotFoundException,
      );
      await expect(service.deleteItem("user-1", "item-x")).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(prisma.groceryItem.update).not.toHaveBeenCalled();
      expect(prisma.groceryItem.delete).not.toHaveBeenCalled();
    });
  });

  describe("budget", () => {
    it("reads the newest entry as the current budget", async () => {
      prisma.groceryBudget.findFirst.mockResolvedValue({
        id: "b-2",
        userId: "user-1",
        amount: d("900"),
        createdAt: new Date("2026-09-25T12:00:00.000Z"),
      });

      const budget = await service.getBudget("user-1");

      expect(prisma.groceryBudget.findFirst).toHaveBeenCalledWith({
        where: { userId: "user-1" },
        orderBy: { createdAt: "desc" },
      });
      expect(budget).toEqual({ amount: "900.00", setAt: "2026-09-25T12:00:00.000Z" });
    });

    it("returns nulls when no budget was ever set", async () => {
      prisma.groceryBudget.findFirst.mockResolvedValue(null);

      expect(await service.getBudget("user-1")).toEqual({ amount: null, setAt: null });
    });

    it("always inserts a new entry, never updates", async () => {
      prisma.groceryBudget.create.mockResolvedValue({
        id: "b-3",
        userId: "user-1",
        amount: d("750"),
        createdAt: new Date("2026-09-25T13:00:00.000Z"),
      });

      const budget = await service.setBudget("user-1", { amount: 750 });

      expect(prisma.groceryBudget.create).toHaveBeenCalledWith({
        data: { userId: "user-1", amount: 750 },
      });
      expect(prisma.groceryBudget.update).not.toHaveBeenCalled();
      expect(budget.amount).toBe("750.00");
    });
  });

  describe("summary", () => {
    it("sums (ideal - current) * price over missing items only, with exact decimals", async () => {
      prisma.groceryItem.findMany.mockResolvedValue([
        // missing 3.5 x 6.49 = 22.715
        { idealQuantity: d("5"), currentQuantity: d("1.5"), estimatedPrice: d("6.49") },
        // missing 2 x 0.10 = 0.20
        { idealQuantity: d("2"), currentQuantity: d("0"), estimatedPrice: d("0.10") },
        // not missing (equal)
        { idealQuantity: d("1"), currentQuantity: d("1"), estimatedPrice: d("30") },
        // not missing (over stock)
        { idealQuantity: d("1"), currentQuantity: d("4"), estimatedPrice: d("30") },
      ]);

      const summary = await service.summary("user-1");

      expect(prisma.groceryItem.findMany).toHaveBeenCalledWith({
        where: { userId: "user-1" },
        select: { idealQuantity: true, currentQuantity: true, estimatedPrice: true },
      });
      // 22.915 -> "22.92" (Decimal toFixed, half-up)
      expect(summary).toEqual({
        totalItemCount: 4,
        missingItemCount: 2,
        estimatedPurchaseTotal: "22.92",
      });
    });

    it("is all zeros for an empty list", async () => {
      expect(await service.summary("user-1")).toEqual({
        totalItemCount: 0,
        missingItemCount: 0,
        estimatedPurchaseTotal: "0.00",
      });
    });
  });
});
