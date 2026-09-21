import { ApiProperty } from "@nestjs/swagger";

export class TransactionDto {
  @ApiProperty({ example: "5f8d0d55-6c3a-4b8e-9c2a-3f1e2d4b5a6c" })
  id!: string;

  @ApiProperty({ example: "a1826c76-8bbe-4dbe-a17d-d458df35c323" })
  categoryId!: string;

  @ApiProperty({ example: "PERSONAL", enum: ["PERSONAL", "BUSINESS"] })
  workspace!: "PERSONAL" | "BUSINESS";

  @ApiProperty({ example: "EXPENSE", enum: ["INCOME", "EXPENSE"] })
  type!: "INCOME" | "EXPENSE";

  @ApiProperty({ example: "PENDING", enum: ["PAID", "PENDING"] })
  status!: "PAID" | "PENDING";

  @ApiProperty({ example: "Aluguel" })
  description!: string;

  @ApiProperty({ example: "1500.50", description: "Decimal string, never a float" })
  amount!: string;

  @ApiProperty({ example: "2026-01-15" })
  date!: string;

  @ApiProperty({ example: false })
  recurring!: boolean;

  @ApiProperty({ example: "2026-01-15T12:00:00.000Z" })
  createdAt!: string;

  @ApiProperty({ example: "2026-01-15T12:00:00.000Z" })
  updatedAt!: string;
}
