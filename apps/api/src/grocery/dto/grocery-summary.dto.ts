import { ApiProperty } from "@nestjs/swagger";

export class GrocerySummaryDto {
  @ApiProperty({ example: 12 })
  totalItemCount!: number;

  @ApiProperty({ example: 4, description: "Items with currentQuantity < idealQuantity" })
  missingItemCount!: number;

  @ApiProperty({
    example: "187.35",
    description:
      "Sum over missing items of (idealQuantity - currentQuantity) * estimatedPrice, over all of the user's items",
  })
  estimatedPurchaseTotal!: string;
}
