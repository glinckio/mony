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
  ValidateIf,
} from "class-validator";

import { DATE_ONLY_REGEX } from "../../common/utils/date.util";

const trim = ({ value }: { value: unknown }) => (typeof value === "string" ? value.trim() : value);

// Omitted = unchanged. Non-nullable fields use `@ValidateIf(isProvided)`
// so an explicit `null` is a 400; the nullable ones use `@IsOptional()`,
// where `null` clears the value.
const isProvided = (_: unknown, value: unknown) => value !== undefined;

export class UpdateVehicleDto {
  @ApiProperty({ example: "Jeep", minLength: 1, maxLength: 100, required: false })
  @ValidateIf(isProvided)
  @Transform(trim)
  @IsString()
  @Length(1, 100)
  make?: string;

  @ApiProperty({ example: "Renegade", minLength: 1, maxLength: 100, required: false })
  @ValidateIf(isProvided)
  @Transform(trim)
  @IsString()
  @Length(1, 100)
  model?: string;

  @ApiProperty({ example: 2021, minimum: MIN_VEHICLE_YEAR, required: false })
  @ValidateIf(isProvided)
  @IsInt()
  @Min(MIN_VEHICLE_YEAR)
  manufactureYear?: number;

  @ApiProperty({
    example: 2022,
    minimum: MIN_VEHICLE_YEAR,
    required: false,
    description: "Checked against the (merged) manufactureYear.",
  })
  @ValidateIf(isProvided)
  @IsInt()
  @Min(MIN_VEHICLE_YEAR)
  modelYear?: number;

  @ApiProperty({
    example: 36200,
    minimum: 0,
    maximum: MAX_VEHICLE_MILEAGE,
    required: false,
    description: "Can never go below the stored value (400).",
  })
  @ValidateIf(isProvided)
  @IsInt()
  @Min(0)
  @Max(MAX_VEHICLE_MILEAGE)
  currentMileage?: number;

  // Explicit `type` on the `T | null` fields — reflection can't see
  // through a union, so Swagger would otherwise publish them as "object".
  @ApiProperty({ type: String, example: "ABC1D23", required: false, nullable: true, maxLength: 10 })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @Length(0, 10)
  licensePlate?: string | null;

  @ApiProperty({ type: String, example: "2022-03-15", required: false, nullable: true })
  @IsOptional()
  @IsDateString({ strict: true })
  @Matches(DATE_ONLY_REGEX, { message: "acquisitionDate must be a date in YYYY-MM-DD format" })
  acquisitionDate?: string | null;

  @ApiProperty({ type: String, example: "Prata", required: false, nullable: true, maxLength: 50 })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @Length(0, 50)
  color?: string | null;

  @ApiProperty({ example: "FLEX", enum: FUEL_TYPES, required: false, nullable: true })
  @IsOptional()
  @IsIn(FUEL_TYPES)
  fuelType?: FuelType | null;
}
