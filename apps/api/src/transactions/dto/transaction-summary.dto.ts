import { ApiProperty } from "@nestjs/swagger";

export class TransactionSummaryDto {
  @ApiProperty({ example: "5000.00" })
  totalIncome!: string;

  @ApiProperty({ example: "3200.00" })
  totalExpensesPaid!: string;

  @ApiProperty({ example: "450.00" })
  totalExpensesPending!: string;

  @ApiProperty({ example: "1800.00" })
  balance!: string;
}
