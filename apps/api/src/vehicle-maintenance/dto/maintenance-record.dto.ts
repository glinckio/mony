import {
  MAINTENANCE_RECEIPT_KINDS,
  MAINTENANCE_SYSTEMS,
  type MaintenanceReceiptKind,
  type MaintenanceSystem,
} from "@mony/shared-types";
import { ApiProperty } from "@nestjs/swagger";

export class MaintenanceRecordTypeDto {
  @ApiProperty({ example: "Troca de óleo e filtro" })
  name!: string;

  @ApiProperty({ example: "LUBRICATION", enum: MAINTENANCE_SYSTEMS, nullable: true })
  system!: MaintenanceSystem | null;
}

export class MaintenanceReceiptDto {
  @ApiProperty({
    example: "https://minio.example.com/mony/vehicles/…/maintenance/…/0d5c….jpg?X-Amz-Signature=…",
    description: "Short-lived presigned GET URL (60–90 min) — never store it.",
  })
  url!: string;

  @ApiProperty({
    example: "IMAGE",
    enum: MAINTENANCE_RECEIPT_KINDS,
    description: "PDF for a PDF upload; IMAGE for any image (always stored as JPEG).",
  })
  kind!: MaintenanceReceiptKind;
}

export class MaintenanceRecordDto {
  @ApiProperty({ example: "9c1d2e3f-4a5b-4c6d-8e9f-0a1b2c3d4e5f" })
  id!: string;

  @ApiProperty({ example: "7e1c2d3b-4a5f-4c6d-9e8f-0a1b2c3d4e5f" })
  vehicleId!: string;

  @ApiProperty({ example: "3b9e1f4a-2c7d-4e8f-9a1b-5c6d7e8f9a0b" })
  maintenanceTypeId!: string;

  @ApiProperty({ type: MaintenanceRecordTypeDto })
  type!: MaintenanceRecordTypeDto;

  @ApiProperty({ example: 42000 })
  mileage!: number;

  @ApiProperty({ example: "2026-09-20" })
  date!: string;

  @ApiProperty({
    type: String,
    example: "289.90",
    nullable: true,
    description: "Decimal string with 2 decimals, never a float.",
  })
  cost!: string | null;

  @ApiProperty({ type: String, example: "Auto Center Silva", nullable: true })
  location!: string | null;

  @ApiProperty({ type: String, example: "Trocado também o filtro de ar.", nullable: true })
  notes!: string | null;

  @ApiProperty({
    type: MaintenanceReceiptDto,
    nullable: true,
    description: "null until a receipt is uploaded (PUT .../receipt).",
  })
  receipt!: MaintenanceReceiptDto | null;

  @ApiProperty({ example: "2026-09-20T18:41:05.000Z" })
  createdAt!: string;
}
