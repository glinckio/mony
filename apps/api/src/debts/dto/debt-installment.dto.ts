import { ApiProperty } from "@nestjs/swagger";

export class DebtInstallmentDto {
  @ApiProperty({ example: "3c4d5e6f-7a8b-4c9d-8e0f-1a2b3c4d5e6f" })
  id!: string;

  @ApiProperty({ example: 1 })
  installmentNo!: number;

  @ApiProperty({ example: "1000.00", description: "Decimal string, never a float" })
  amount!: string;

  @ApiProperty({ example: "2026-01-10" })
  dueDate!: string;

  @ApiProperty({ example: "PAID", enum: ["PENDING", "PAID"] })
  status!: "PENDING" | "PAID";

  // Explicit `type` on the `T | null` fields — reflection can't see
  // through a union, so Swagger would otherwise publish them as "object".
  @ApiProperty({ type: String, example: "2026-01-10", nullable: true })
  paymentDate!: string | null;

  @ApiProperty({
    type: String,
    example: "5f8d0d55-6c3a-4b8e-9c2a-3f1e2d4b5a6c",
    nullable: true,
    description: "Linked expense transaction; null if that transaction was deleted",
  })
  transactionId!: string | null;
}
