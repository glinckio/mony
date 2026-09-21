import { ApiProperty } from "@nestjs/swagger";
import { IsDateString, IsNumber, IsOptional, IsPositive, IsString, IsUUID, Length } from "class-validator";

// `type`, `recurring`, and `recurringMonths` aren't editable — matches
// legacy (atualizarTransacao never takes a `tipo` param) and recurring
// batches are only generated once, at creation.
export class UpdateTransactionDto {
  @ApiProperty({ example: "5f8d0d55-6c3a-4b8e-9c2a-3f1e2d4b5a6c", required: false })
  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @ApiProperty({ example: "Aluguel", minLength: 1, maxLength: 255, required: false })
  @IsOptional()
  @IsString()
  @Length(1, 255)
  description?: string;

  @ApiProperty({ example: 1500.5, required: false })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  amount?: number;

  @ApiProperty({ example: "2026-01-15", required: false })
  @IsOptional()
  @IsDateString()
  date?: string;
}
