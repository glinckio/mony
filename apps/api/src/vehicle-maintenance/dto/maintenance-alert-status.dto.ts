import {
  MAINTENANCE_STATUSES,
  MAINTENANCE_SYSTEMS,
  type MaintenanceStatus,
  type MaintenanceSystem,
} from "@mony/shared-types";
import { ApiProperty } from "@nestjs/swagger";

export class LastServiceDto {
  @ApiProperty({ example: "2026-06-01" })
  date!: string;

  @ApiProperty({ example: 40000 })
  mileage!: number;
}

// Computed on every read from the vehicle's mileage, the alert and the
// type's latest record — never stored.
export class MaintenanceAlertStatusDto {
  @ApiProperty({ example: "3b9e1f4a-2c7d-4e8f-9a1b-5c6d7e8f9a0b" })
  maintenanceTypeId!: string;

  @ApiProperty({ example: "Troca de óleo e filtro" })
  name!: string;

  @ApiProperty({ example: "LUBRICATION", enum: MAINTENANCE_SYSTEMS, nullable: true })
  system!: MaintenanceSystem | null;

  @ApiProperty({ example: 10000 })
  kmInterval!: number;

  @ApiProperty({ type: Number, example: 12, nullable: true })
  monthsInterval!: number | null;

  @ApiProperty({
    example: "URGENT",
    enum: MAINTENANCE_STATUSES,
    description:
      "More urgent of the km and time signals. Never serviced = OVERDUE. See docs/specs/vehicle-maintenance/requirements.md.",
  })
  status!: MaintenanceStatus;

  @ApiProperty({
    example: 90,
    minimum: 0,
    maximum: 100,
    description: "Integer: how close to due (the higher of the km and time signals).",
  })
  percent!: number;

  @ApiProperty({ example: 50000, description: "Mileage the next service is due at." })
  nextMileage!: number;

  @ApiProperty({ example: 800, description: "nextMileage − currentMileage; negative once passed." })
  kmRemaining!: number;

  @ApiProperty({
    type: String,
    example: "2027-06-01",
    nullable: true,
    description: "Only when the type has monthsInterval and was serviced before.",
  })
  nextDate!: string | null;

  @ApiProperty({ type: Number, example: 248, nullable: true, description: "Negative once passed." })
  daysRemaining!: number | null;

  @ApiProperty({
    type: LastServiceDto,
    nullable: true,
    description: "Latest record of this type on the vehicle; null if never serviced (OVERDUE).",
  })
  lastService!: LastServiceDto | null;
}
