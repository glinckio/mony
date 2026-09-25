import { Injectable, NotFoundException } from "@nestjs/common";
import { Prisma, type GroceryBudget, type GroceryItem } from "@prisma/client";

import { decimalToString } from "../common/utils/money.util";
import { PrismaService } from "../prisma/prisma.service";

import { CreateGroceryItemDto } from "./dto/create-grocery-item.dto";
import { GroceryBudgetDto } from "./dto/grocery-budget.dto";
import { GroceryItemDto } from "./dto/grocery-item.dto";
import { GrocerySummaryDto } from "./dto/grocery-summary.dto";
import { SetGroceryBudgetDto } from "./dto/set-grocery-budget.dto";
import { UpdateGroceryItemDto } from "./dto/update-grocery-item.dto";

// Household stock list + informational budget (legacy `mercado.php`).
// User-level, not workspace-scoped, and the budget never blocks anything
// — see docs/specs/grocery/requirements.md.
@Injectable()
export class GroceryService {
  constructor(private readonly prisma: PrismaService) {}

  async listItems(userId: string): Promise<GroceryItemDto[]> {
    // Postgres orders an enum by declaration order, and GroceryCategory is
    // declared in the alphabetical order of its pt-BR labels — so this
    // matches legacy's `ORDER BY categoria, nome` on the Portuguese strings.
    const items = await this.prisma.groceryItem.findMany({
      where: { userId },
      orderBy: [{ category: "asc" }, { name: "asc" }],
    });
    return items.map((item) => this.toItemDto(item));
  }

  async createItem(userId: string, dto: CreateGroceryItemDto): Promise<GroceryItemDto> {
    const item = await this.prisma.groceryItem.create({
      data: {
        userId,
        name: dto.name,
        unit: dto.unit,
        idealQuantity: dto.idealQuantity,
        currentQuantity: dto.currentQuantity ?? 0,
        estimatedPrice: dto.estimatedPrice,
        category: dto.category,
      },
    });
    return this.toItemDto(item);
  }

  async updateItem(userId: string, id: string, dto: UpdateGroceryItemDto): Promise<GroceryItemDto> {
    await this.findOwnedItem(userId, id);
    const item = await this.prisma.groceryItem.update({
      where: { id },
      data: {
        name: dto.name,
        unit: dto.unit,
        idealQuantity: dto.idealQuantity,
        currentQuantity: dto.currentQuantity,
        estimatedPrice: dto.estimatedPrice,
        category: dto.category,
      },
    });
    return this.toItemDto(item);
  }

  async deleteItem(userId: string, id: string): Promise<void> {
    await this.findOwnedItem(userId, id);
    await this.prisma.groceryItem.delete({ where: { id } });
  }

  async getBudget(userId: string): Promise<GroceryBudgetDto> {
    // Newest by createdAt (legacy used ORDER BY id DESC on an
    // auto-increment id; ours are UUIDs, so there's no id tiebreak). Two
    // budgets set in the same millisecond have no defined "latest" — not
    // reachable from the app, whose save button is disabled while in flight.
    const budget = await this.prisma.groceryBudget.findFirst({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });
    return this.toBudgetDto(budget);
  }

  // Always a new row, never an UPDATE — legacy keeps the history as an
  // audit trail and reads the newest entry as the current budget.
  async setBudget(userId: string, dto: SetGroceryBudgetDto): Promise<GroceryBudgetDto> {
    const budget = await this.prisma.groceryBudget.create({
      data: { userId, amount: dto.amount },
    });
    return this.toBudgetDto(budget);
  }

  // Over ALL of the user's items (legacy computed it over whatever filter
  // was active). One query; a household list is tens of rows, so the sum
  // is done in memory with exact decimals rather than in SQL.
  async summary(userId: string): Promise<GrocerySummaryDto> {
    const items = await this.prisma.groceryItem.findMany({
      where: { userId },
      select: { idealQuantity: true, currentQuantity: true, estimatedPrice: true },
    });

    let missingItemCount = 0;
    let estimatedPurchaseTotal = new Prisma.Decimal(0);
    for (const item of items) {
      if (item.currentQuantity.lessThan(item.idealQuantity)) {
        missingItemCount++;
        estimatedPurchaseTotal = estimatedPurchaseTotal.plus(
          item.idealQuantity.minus(item.currentQuantity).times(item.estimatedPrice),
        );
      }
    }

    return {
      totalItemCount: items.length,
      missingItemCount,
      estimatedPurchaseTotal: decimalToString(estimatedPurchaseTotal),
    };
  }

  private async findOwnedItem(userId: string, id: string): Promise<GroceryItem> {
    const item = await this.prisma.groceryItem.findFirst({ where: { id, userId } });
    if (!item) {
      throw new NotFoundException("Grocery item not found.");
    }
    return item;
  }

  private toItemDto(item: GroceryItem): GroceryItemDto {
    return {
      id: item.id,
      name: item.name,
      unit: item.unit,
      idealQuantity: decimalToString(item.idealQuantity),
      currentQuantity: decimalToString(item.currentQuantity),
      estimatedPrice: decimalToString(item.estimatedPrice),
      category: item.category,
      missing: item.currentQuantity.lessThan(item.idealQuantity),
      createdAt: item.createdAt.toISOString(),
      updatedAt: item.updatedAt.toISOString(),
    };
  }

  private toBudgetDto(budget: GroceryBudget | null): GroceryBudgetDto {
    return {
      amount: budget ? decimalToString(budget.amount) : null,
      setAt: budget ? budget.createdAt.toISOString() : null,
    };
  }
}
