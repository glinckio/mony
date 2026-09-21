import { ApiProperty } from "@nestjs/swagger";

import { TransactionDto } from "./transaction.dto";

export class PaginatedTransactionsDto {
  @ApiProperty({ type: [TransactionDto] })
  items!: TransactionDto[];

  @ApiProperty({ example: 42 })
  total!: number;

  @ApiProperty({ example: 1 })
  page!: number;

  @ApiProperty({ example: 20 })
  perPage!: number;
}
