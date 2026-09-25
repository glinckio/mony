import { MAX_DEBT_INSTALLMENTS } from "@mony/shared-types";
import { ApiProperty } from "@nestjs/swagger";
import {
  IsDateString,
  IsInt,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
  Length,
  Matches,
  Max,
  Min,
} from "class-validator";

import { DATE_ONLY_REGEX } from "../../common/utils/date.util";
import { MAX_MONEY_AMOUNT } from "../../common/utils/money.util";

export class CreateDebtDto {
  @ApiProperty({ example: "Financiamento do carro", minLength: 1, maxLength: 100 })
  @IsString()
  @Length(1, 100)
  name!: string;

  @ApiProperty({
    example: 12000,
    maximum: MAX_MONEY_AMOUNT,
    description:
      "Split evenly across installments, to the cent (the last installment absorbs the remainder). Must give every installment at least 0.01.",
  })
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  @Max(MAX_MONEY_AMOUNT)
  totalAmount!: number;

  @ApiProperty({ example: 12, minimum: 1, maximum: MAX_DEBT_INSTALLMENTS })
  @IsInt()
  @Min(1)
  @Max(MAX_DEBT_INSTALLMENTS)
  totalInstallments!: number;

  @ApiProperty({
    example: "2026-01-10",
    description: "Due date of installment 1; installment N is due startDate + (N-1) months.",
  })
  @IsDateString({ strict: true })
  @Matches(DATE_ONLY_REGEX, { message: "startDate must be a date in YYYY-MM-DD format" })
  startDate!: string;

  @ApiProperty({
    example: "2026-12-10",
    required: false,
    description: "Informational only. Must not be before startDate.",
  })
  @IsOptional()
  @IsDateString({ strict: true })
  @Matches(DATE_ONLY_REGEX, { message: "endDate must be a date in YYYY-MM-DD format" })
  endDate?: string;

  @ApiProperty({
    example: 1.99,
    required: false,
    minimum: 0,
    maximum: 999.99,
    description:
      "Monthly rate in percent. Informational only, never applied to installment amounts.",
  })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(999.99)
  interestRate?: number;

  @ApiProperty({
    example: "5f8d0d55-6c3a-4b8e-9c2a-3f1e2d4b5a6c",
    required: false,
    description:
      "Must be one of the user's EXPENSE categories. When omitted, linked transactions use the user's oldest expense category.",
  })
  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @ApiProperty({
    example: "Parcelas no boleto, vencimento todo dia 10",
    required: false,
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @Length(0, 500)
  notes?: string;
}
