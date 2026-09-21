import { ApiProperty } from "@nestjs/swagger";
import {
  IsBoolean,
  IsDateString,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
  Length,
  Min,
} from "class-validator";

export class UpdateGoalDto {
  @ApiProperty({ example: "Viagem para a praia", minLength: 1, maxLength: 100, required: false })
  @IsOptional()
  @IsString()
  @Length(1, 100)
  title?: string;

  @ApiProperty({ example: "Economizar para as férias de julho", required: false, maxLength: 500 })
  @IsOptional()
  @IsString()
  @Length(0, 500)
  description?: string;

  @ApiProperty({ example: 5000, required: false })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  targetAmount?: number;

  @ApiProperty({ example: 1500, required: false })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  currentAmount?: number;

  @ApiProperty({ example: "2026-07-01", required: false })
  @IsOptional()
  @IsDateString()
  targetDate?: string;

  @ApiProperty({ example: "5f8d0d55-6c3a-4b8e-9c2a-3f1e2d4b5a6c", required: false })
  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @ApiProperty({
    example: true,
    required: false,
    description: "Manually set — never auto-derived from currentAmount >= targetAmount.",
  })
  @IsOptional()
  @IsBoolean()
  completed?: boolean;
}
