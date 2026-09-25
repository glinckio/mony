import {
  FUEL_TYPES,
  MAX_VEHICLE_MILEAGE,
  MIN_VEHICLE_YEAR,
  type FuelType,
} from "@mony/shared-types";
import { ApiProperty } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import {
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Length,
  Matches,
  Max,
  Min,
} from "class-validator";

import { DATE_ONLY_REGEX } from "../../common/utils/date.util";

const trim = ({ value }: { value: unknown }) => (typeof value === "string" ? value.trim() : value);

export class CreateVehicleDto {
  @ApiProperty({ example: "Jeep", minLength: 1, maxLength: 100 })
  @Transform(trim)
  @IsString()
  @Length(1, 100)
  make!: string;

  @ApiProperty({ example: "Renegade", minLength: 1, maxLength: 100 })
  @Transform(trim)
  @IsString()
  @Length(1, 100)
  model!: string;

  @ApiProperty({
    example: 2021,
    minimum: MIN_VEHICLE_YEAR,
    description: "Up to next year (checked at request time).",
  })
  @IsInt()
  @Min(MIN_VEHICLE_YEAR)
  manufactureYear!: number;

  @ApiProperty({
    example: 2022,
    minimum: MIN_VEHICLE_YEAR,
    description: "Must be >= manufactureYear, and up to next year.",
  })
  @IsInt()
  @Min(MIN_VEHICLE_YEAR)
  modelYear!: number;

  @ApiProperty({ example: 35000, minimum: 0, maximum: MAX_VEHICLE_MILEAGE })
  @IsInt()
  @Min(0)
  @Max(MAX_VEHICLE_MILEAGE)
  currentMileage!: number;

  @ApiProperty({
    example: "ABC1D23",
    required: false,
    maxLength: 10,
    description: "No format or uniqueness check (matches legacy). Blank is stored as null.",
  })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @Length(0, 10)
  licensePlate?: string;

  @ApiProperty({ example: "2022-03-15", required: false })
  @IsOptional()
  @IsDateString({ strict: true })
  @Matches(DATE_ONLY_REGEX, { message: "acquisitionDate must be a date in YYYY-MM-DD format" })
  acquisitionDate?: string;

  @ApiProperty({ example: "Prata", required: false, maxLength: 50 })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @Length(0, 50)
  color?: string;

  @ApiProperty({ example: "FLEX", enum: FUEL_TYPES, required: false })
  @IsOptional()
  @IsIn(FUEL_TYPES)
  fuelType?: FuelType;
}
