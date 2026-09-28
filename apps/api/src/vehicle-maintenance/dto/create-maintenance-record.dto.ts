import { MAX_VEHICLE_MILEAGE } from "@mony/shared-types";
import { ApiProperty } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import {
  IsDateString,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Matches,
  Max,
  Min,
} from "class-validator";

import { DATE_ONLY_REGEX } from "../../common/utils/date.util";
import { MAX_MONEY_AMOUNT } from "../../common/utils/money.util";

const trim = ({ value }: { value: unknown }) => (typeof value === "string" ? value.trim() : value);

export class CreateMaintenanceRecordDto {
  @ApiProperty({
    example: "3b9e1f4a-2c7d-4e8f-9a1b-5c6d7e8f9a0b",
    description: "One of the current user's maintenance types.",
  })
  @IsUUID()
  maintenanceTypeId!: string;

  @ApiProperty({
    example: 42000,
    minimum: 1,
    maximum: MAX_VEHICLE_MILEAGE,
    description:
      "Odometer at the service. Raises the vehicle's mileage if higher; a lower value is kept as a past service.",
  })
  @IsInt()
  @Min(1)
  @Max(MAX_VEHICLE_MILEAGE)
  mileage!: number;

  @ApiProperty({ example: "2026-09-20", description: "YYYY-MM-DD, not after today (UTC)." })
  @IsDateString({ strict: true })
  @Matches(DATE_ONLY_REGEX, { message: "date must be a date in YYYY-MM-DD format" })
  date!: string;

  @ApiProperty({
    example: 289.9,
    required: false,
    minimum: 0,
    maximum: MAX_MONEY_AMOUNT,
    description: "Up to 2 decimal places. Omitted = null.",
  })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(MAX_MONEY_AMOUNT)
  cost?: number;

  @ApiProperty({
    example: "Auto Center Silva",
    required: false,
    maxLength: 100,
    description: "Blank is stored as null.",
  })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @Length(0, 100)
  location?: string;

  @ApiProperty({
    example: "Trocado também o filtro de ar.",
    required: false,
    maxLength: 500,
    description: "Blank is stored as null.",
  })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @Length(0, 500)
  notes?: string;
}
