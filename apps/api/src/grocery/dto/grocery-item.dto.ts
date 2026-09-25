import { GROCERY_CATEGORIES, type GroceryCategory } from "@mony/shared-types";
import { ApiProperty } from "@nestjs/swagger";

export class GroceryItemDto {
  @ApiProperty({ example: "4b1d3c2a-9e8f-4a7b-8c6d-5e4f3a2b1c0d" })
  id!: string;

  @ApiProperty({ example: "Arroz" })
  name!: string;

  @ApiProperty({ example: "kg" })
  unit!: string;

  @ApiProperty({ example: "5.00", description: "Decimal string" })
  idealQuantity!: string;

  @ApiProperty({ example: "1.50", description: "Decimal string" })
  currentQuantity!: string;

  @ApiProperty({ example: "6.49", description: "Decimal string, per unit" })
  estimatedPrice!: string;

  @ApiProperty({ example: "PANTRY", enum: GROCERY_CATEGORIES })
  category!: GroceryCategory;

  @ApiProperty({ example: true, description: "currentQuantity < idealQuantity" })
  missing!: boolean;

  @ApiProperty({ example: "2026-09-25T12:00:00.000Z" })
  createdAt!: string;

  @ApiProperty({ example: "2026-09-25T12:00:00.000Z" })
  updatedAt!: string;
}
