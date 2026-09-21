import { ApiProperty } from "@nestjs/swagger";

export class CategoryDto {
  @ApiProperty({ example: "5f8d0d55-6c3a-4b8e-9c2a-3f1e2d4b5a6c" })
  id!: string;

  @ApiProperty({ example: "Alimentação" })
  name!: string;

  @ApiProperty({ example: "EXPENSE", enum: ["INCOME", "EXPENSE"] })
  type!: "INCOME" | "EXPENSE";

  @ApiProperty({ example: "#3B82F6" })
  color!: string;

  @ApiProperty({ example: "restaurant-outline" })
  icon!: string;

  @ApiProperty({ example: "2026-01-15T12:00:00.000Z" })
  createdAt!: string;
}
