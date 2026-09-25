import { ApiProperty } from "@nestjs/swagger";
import { IsNumber, Max, Min } from "class-validator";

import { MAX_MONEY_AMOUNT } from "../../common/utils/money.util";

export class SetGroceryBudgetDto {
  @ApiProperty({
    example: 800,
    minimum: 0,
    maximum: MAX_MONEY_AMOUNT,
    description: "Always recorded as a new entry; the newest one is the current budget.",
  })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(MAX_MONEY_AMOUNT)
  amount!: number;
}
