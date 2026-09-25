import { FUEL_TYPES, type FuelType } from "@mony/shared-types";
import { ApiProperty } from "@nestjs/swagger";

export class VehicleDto {
  @ApiProperty({ example: "7e1c2d3b-4a5f-4c6d-9e8f-0a1b2c3d4e5f" })
  id!: string;

  @ApiProperty({ example: "Jeep" })
  make!: string;

  @ApiProperty({ example: "Renegade" })
  model!: string;

  @ApiProperty({ example: "Jeep Renegade 2022", description: '"{make} {model} {modelYear}"' })
  displayName!: string;

  @ApiProperty({ example: 2021 })
  manufactureYear!: number;

  @ApiProperty({ example: 2022 })
  modelYear!: number;

  @ApiProperty({ example: 35000 })
  currentMileage!: number;

  // Explicit `type` on the `T | null` fields — reflection can't see
  // through a union, so Swagger would otherwise publish them as "object".
  @ApiProperty({ type: String, example: "ABC1D23", nullable: true })
  licensePlate!: string | null;

  @ApiProperty({ type: String, example: "2022-03-15", nullable: true })
  acquisitionDate!: string | null;

  @ApiProperty({ type: String, example: "Prata", nullable: true })
  color!: string | null;

  @ApiProperty({ example: "FLEX", enum: FUEL_TYPES, nullable: true })
  fuelType!: FuelType | null;

  @ApiProperty({
    type: String,
    nullable: true,
    example:
      "http://192.168.0.10:9010/mony/vehicles/…/photo.jpg?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Expires=3600&…",
    description:
      "Short-lived signed URL (valid 60–90 min; identical across responses within a 30-min window so image caches work). The bucket is private. Don't persist it.",
  })
  photoUrl!: string | null;

  @ApiProperty({ example: "2026-09-25T12:00:00.000Z" })
  createdAt!: string;

  @ApiProperty({ example: "2026-09-25T12:00:00.000Z" })
  updatedAt!: string;
}
