import { ApiProperty } from "@nestjs/swagger";

export class DebtDto {
  @ApiProperty({ example: "9b2f4c1e-7a3d-4e5f-8a6b-1c2d3e4f5a6b" })
  id!: string;

  @ApiProperty({ example: "PERSONAL", enum: ["PERSONAL", "BUSINESS"] })
  workspace!: "PERSONAL" | "BUSINESS";

  // Explicit `type` on the `T | null` fields — reflection can't see
  // through a union, so Swagger would otherwise publish them as "object".
  @ApiProperty({ type: String, example: "a1826c76-8bbe-4dbe-a17d-d458df35c323", nullable: true })
  categoryId!: string | null;

  @ApiProperty({ example: "Financiamento do carro" })
  name!: string;

  @ApiProperty({ example: "12000.00", description: "Decimal string, never a float" })
  totalAmount!: string;

  @ApiProperty({ example: "1000.00", description: "Sum of paid installments' amounts" })
  paidAmount!: string;

  @ApiProperty({ example: "11000.00", description: "totalAmount - paidAmount" })
  remainingAmount!: string;

  @ApiProperty({ example: "2026-01-10" })
  startDate!: string;

  @ApiProperty({ type: String, example: "2026-12-10", nullable: true })
  endDate!: string | null;

  @ApiProperty({
    type: String,
    example: "1.99",
    nullable: true,
    description: "Informational only, never applied",
  })
  interestRate!: string | null;

  @ApiProperty({ example: 12 })
  totalInstallments!: number;

  @ApiProperty({ example: 1 })
  paidInstallments!: number;

  @ApiProperty({
    type: String,
    example: "Parcelas no boleto, vencimento todo dia 10",
    nullable: true,
  })
  notes!: string | null;

  @ApiProperty({
    example: "ACTIVE",
    enum: ["ACTIVE", "PAID_OFF", "OVERDUE"],
    description: "PAID_OFF when every installment is paid; OVERDUE when a pending one is past due",
  })
  status!: "ACTIVE" | "PAID_OFF" | "OVERDUE";

  @ApiProperty({ example: "2026-01-10T12:00:00.000Z" })
  createdAt!: string;

  @ApiProperty({ example: "2026-01-10T12:00:00.000Z" })
  updatedAt!: string;
}
