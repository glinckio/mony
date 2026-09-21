import { ApiProperty } from "@nestjs/swagger";
import {
  IsBoolean,
  IsDateString,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
  Length,
  Max,
  Min,
  ValidateIf,
} from "class-validator";

export class CreateTransactionDto {
  @ApiProperty({ example: "5f8d0d55-6c3a-4b8e-9c2a-3f1e2d4b5a6c" })
  @IsUUID()
  categoryId!: string;

  @ApiProperty({ example: "EXPENSE", enum: ["INCOME", "EXPENSE"] })
  @IsIn(["INCOME", "EXPENSE"])
  type!: "INCOME" | "EXPENSE";

  @ApiProperty({
    example: "PENDING",
    enum: ["PAID", "PENDING"],
    required: false,
    description: "Ignored (forced PAID) when type=INCOME. Defaults to PENDING for expenses.",
  })
  @IsOptional()
  @IsIn(["PAID", "PENDING"])
  status?: "PAID" | "PENDING";

  @ApiProperty({ example: "Aluguel", minLength: 1, maxLength: 255 })
  @IsString()
  @Length(1, 255)
  description!: string;

  @ApiProperty({ example: 1500.5 })
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  amount!: number;

  @ApiProperty({ example: "2026-01-15" })
  @IsDateString()
  date!: string;

  @ApiProperty({ example: false, required: false })
  @IsOptional()
  @IsBoolean()
  recurring?: boolean;

  @ApiProperty({
    example: 12,
    minimum: 1,
    maximum: 60,
    required: false,
    description: "Required when recurring=true.",
  })
  @ValidateIf((dto: CreateTransactionDto) => dto.recurring === true)
  @IsInt()
  @Min(1)
  @Max(60)
  recurringMonths?: number;
}
