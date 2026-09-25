import { ApiProperty } from "@nestjs/swagger";
import { IsDateString, IsNumber, IsPositive, Matches, Max } from "class-validator";

import { DATE_ONLY_REGEX } from "../../common/utils/date.util";
import { MAX_MONEY_AMOUNT } from "../../common/utils/money.util";

export class PayInstallmentDto {
  @ApiProperty({ example: "2026-02-10", description: "Becomes the linked transaction's date too." })
  @IsDateString({ strict: true })
  @Matches(DATE_ONLY_REGEX, { message: "paymentDate must be a date in YYYY-MM-DD format" })
  paymentDate!: string;

  @ApiProperty({
    example: 1000,
    maximum: MAX_MONEY_AMOUNT,
    description:
      "Never overwrites the installment's own amount. Only used as the amount of a replacement transaction when the linked one was deleted.",
  })
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  @Max(MAX_MONEY_AMOUNT)
  paidAmount!: number;
}
