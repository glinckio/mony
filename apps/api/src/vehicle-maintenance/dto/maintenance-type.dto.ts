import { MAINTENANCE_SYSTEMS, type MaintenanceSystem } from "@mony/shared-types";
import { ApiProperty } from "@nestjs/swagger";

export class MaintenanceTypeDto {
  @ApiProperty({ example: "3b9e1f4a-2c7d-4e8f-9a1b-5c6d7e8f9a0b" })
  id!: string;

  @ApiProperty({ example: "Troca de óleo e filtro" })
  name!: string;

  // Explicit `type` on the `T | null` fields — reflection can't see
  // through a union, so Swagger would otherwise publish them as "object".
  @ApiProperty({ type: String, example: "Óleo 5W30 sintético", nullable: true })
  description!: string | null;

  @ApiProperty({ example: "LUBRICATION", enum: MAINTENANCE_SYSTEMS, nullable: true })
  system!: MaintenanceSystem | null;

  @ApiProperty({ example: 10000, description: "Service every N km." })
  kmInterval!: number;

  @ApiProperty({
    type: Number,
    example: 12,
    nullable: true,
    description: "Also due every N months after the last service, if set.",
  })
  monthsInterval!: number | null;

  @ApiProperty({ example: "2026-09-26T14:03:11.000Z" })
  createdAt!: string;
}
