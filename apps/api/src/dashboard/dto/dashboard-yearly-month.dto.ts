import { ApiProperty } from "@nestjs/swagger";

export class DashboardYearlyMonthDto {
  @ApiProperty({ example: 1, minimum: 1, maximum: 12 })
  month!: number;

  @ApiProperty({ example: "5000.00" })
  income!: string;

  @ApiProperty({ example: "3200.00" })
  expensesPaid!: string;
}
