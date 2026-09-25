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
  ValidateIf,
} from "class-validator";

import { DATE_ONLY_REGEX } from "../../common/utils/date.util";
import { MAX_MONEY_AMOUNT } from "../../common/utils/money.util";

// Omitted = unchanged. `null` clears the nullable fields (endDate,
// interestRate, categoryId, notes) — `@IsOptional()` skips validation for
// both null and undefined, and the service tells them apart. The
// non-nullable fields use `@ValidateIf(isProvided)` instead, so an explicit
// `null` is a 400 rather than slipping through (a null startDate would
// otherwise read as "changed" and regenerate every installment).
const isProvided = (_: unknown, value: unknown) => value !== undefined;

export class UpdateDebtDto {
  @ApiProperty({ example: "Financiamento do carro", minLength: 1, maxLength: 100, required: false })
  @ValidateIf(isProvided)
  @IsString()
  @Length(1, 100)
  name?: string;

  @ApiProperty({
    example: 13200,
    required: false,
    maximum: MAX_MONEY_AMOUNT,
    description:
      "Without an installment-count/start-date change, only pending installments (and their linked transactions) are recalculated.",
  })
  @ValidateIf(isProvided)
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  @Max(MAX_MONEY_AMOUNT)
  totalAmount?: number;

  @ApiProperty({
    example: 12,
    minimum: 1,
    maximum: MAX_DEBT_INSTALLMENTS,
    required: false,
    description: "Regenerates every installment. Rejected (400) once any installment is paid.",
  })
  @ValidateIf(isProvided)
  @IsInt()
  @Min(1)
  @Max(MAX_DEBT_INSTALLMENTS)
  totalInstallments?: number;

  @ApiProperty({
    example: "2026-01-10",
    required: false,
    description: "Regenerates every installment. Rejected (400) once any installment is paid.",
  })
  @ValidateIf(isProvided)
  @IsDateString({ strict: true })
  @Matches(DATE_ONLY_REGEX, { message: "startDate must be a date in YYYY-MM-DD format" })
  startDate?: string;

  // Explicit `type` on the `T | null` fields — reflection can't see
  // through a union, so Swagger would otherwise publish them as "object".
  @ApiProperty({ type: String, example: "2026-12-10", required: false, nullable: true })
  @IsOptional()
  @IsDateString({ strict: true })
  @Matches(DATE_ONLY_REGEX, { message: "endDate must be a date in YYYY-MM-DD format" })
  endDate?: string | null;

  @ApiProperty({
    type: Number,
    example: 1.99,
    required: false,
    nullable: true,
    minimum: 0,
    maximum: 999.99,
  })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(999.99)
  interestRate?: number | null;

  @ApiProperty({
    type: String,
    example: "5f8d0d55-6c3a-4b8e-9c2a-3f1e2d4b5a6c",
    required: false,
    nullable: true,
    description:
      "A new category is propagated to every linked transaction; null clears the debt's own category and leaves the transactions as they are.",
  })
  @IsOptional()
  @IsUUID()
  categoryId?: string | null;

  @ApiProperty({
    type: String,
    example: "Renegociado em março",
    required: false,
    nullable: true,
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @Length(0, 500)
  notes?: string | null;
}
