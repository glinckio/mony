import { ApiProperty } from "@nestjs/swagger";

export class GroceryBudgetDto {
  // Explicit `type` on the `T | null` fields — reflection can't see
  // through a union, so Swagger would otherwise publish them as "object".
  @ApiProperty({
    type: String,
    example: "800.00",
    nullable: true,
    description: "Newest budget entry; null when none was ever set",
  })
  amount!: string | null;

  @ApiProperty({ type: String, example: "2026-09-25T12:00:00.000Z", nullable: true })
  setAt!: string | null;
}
