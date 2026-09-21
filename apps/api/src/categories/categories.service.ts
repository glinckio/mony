import { randomInt } from "crypto";

import { CATEGORY_COLORS } from "@mony/shared-types";
import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import type { Category } from "@prisma/client";

import { PrismaService } from "../prisma/prisma.service";

import { CategoryDto } from "./dto/category.dto";
import { CreateCategoryDto } from "./dto/create-category.dto";
import { UpdateCategoryDto } from "./dto/update-category.dto";

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(userId: string, type?: "INCOME" | "EXPENSE"): Promise<CategoryDto[]> {
    const categories = await this.prisma.category.findMany({
      where: { userId, ...(type ? { type } : {}) },
      orderBy: { name: "asc" },
    });
    return categories.map((category) => this.toDto(category));
  }

  async create(userId: string, dto: CreateCategoryDto): Promise<CategoryDto> {
    const category = await this.prisma.category.create({
      data: {
        userId,
        name: dto.name,
        type: dto.type,
        color: dto.color ?? this.randomColor(),
        icon: dto.icon,
      },
    });
    return this.toDto(category);
  }

  async update(userId: string, id: string, dto: UpdateCategoryDto): Promise<CategoryDto> {
    await this.findOwned(userId, id);

    const category = await this.prisma.category.update({
      where: { id },
      data: {
        name: dto.name,
        color: dto.color,
        icon: dto.icon,
      },
    });
    return this.toDto(category);
  }

  // No transaction-in-use / reassign check yet — the `transactions`
  // feature (which owns the FK to Category) hasn't landed, so nothing
  // can reference a category yet. `replacementCategoryId` is accepted
  // and validated for ownership below so the API contract is stable,
  // but it's a no-op until that feature adds the usage check ahead of
  // this delete, per docs/specs/categories/design.md.
  async delete(userId: string, id: string, replacementCategoryId?: string): Promise<void> {
    const category = await this.findOwned(userId, id);

    if (replacementCategoryId) {
      if (replacementCategoryId === id) {
        throw new BadRequestException(
          "replacementCategoryId cannot be the category being deleted.",
        );
      }
      const replacement = await this.findOwned(userId, replacementCategoryId);
      if (replacement.type !== category.type) {
        throw new BadRequestException("replacementCategoryId must have the same type.");
      }
    }

    await this.prisma.category.delete({ where: { id } });
  }

  private async findOwned(userId: string, id: string): Promise<Category> {
    const category = await this.prisma.category.findFirst({ where: { id, userId } });
    if (!category) {
      throw new NotFoundException("Category not found.");
    }
    return category;
  }

  private randomColor(): string {
    return CATEGORY_COLORS[randomInt(0, CATEGORY_COLORS.length)]!;
  }

  private toDto(category: Category): CategoryDto {
    return {
      id: category.id,
      name: category.name,
      type: category.type,
      color: category.color,
      icon: category.icon,
      createdAt: category.createdAt.toISOString(),
    };
  }
}
