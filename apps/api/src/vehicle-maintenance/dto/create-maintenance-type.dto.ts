import {
  MAINTENANCE_SYSTEMS,
  MAX_MAINTENANCE_KM_INTERVAL,
  MAX_MAINTENANCE_MONTHS_INTERVAL,
  type MaintenanceSystem,
} from "@mony/shared-types";
import { ApiProperty } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import { IsIn, IsInt, IsOptional, IsString, Length, Max, Min } from "class-validator";

const trim = ({ value }: { value: unknown }) => (typeof value === "string" ? value.trim() : value);

export class CreateMaintenanceTypeDto {
  @ApiProperty({ example: "Troca de óleo e filtro", minLength: 1, maxLength: 100 })
  @Transform(trim)
  @IsString()
  @Length(1, 100)
  name!: string;

  @ApiProperty({ example: 10000, minimum: 1, maximum: MAX_MAINTENANCE_KM_INTERVAL })
  @IsInt()
  @Min(1)
  @Max(MAX_MAINTENANCE_KM_INTERVAL)
  kmInterval!: number;

  @ApiProperty({
    example: 12,
    required: false,
    minimum: 1,
    maximum: MAX_MAINTENANCE_MONTHS_INTERVAL,
    description: "Optional time interval; whichever (km or time) comes first wins.",
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(MAX_MAINTENANCE_MONTHS_INTERVAL)
  monthsInterval?: number;

  @ApiProperty({ example: "LUBRICATION", enum: MAINTENANCE_SYSTEMS, required: false })
  @IsOptional()
  @IsIn(MAINTENANCE_SYSTEMS)
  system?: MaintenanceSystem;

  @ApiProperty({
    example: "Óleo 5W30 sintético",
    required: false,
    maxLength: 255,
    description: "Blank is stored as null.",
  })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @Length(0, 255)
  description?: string;
}
