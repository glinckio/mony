import { ApiProperty } from "@nestjs/swagger";

// GET /reports (docs/specs/reports/design.md). Money as decimal strings;
// "expenses" are paid ones only.

export class ReportSummaryDto {
  @ApiProperty({ example: "15400.00" })
  totalIncome!: string;

  @ApiProperty({ example: "11086.35", description: "Paid expenses only" })
  totalExpensesPaid!: string;

  @ApiProperty({ example: "4313.65", description: "totalIncome − totalExpensesPaid" })
  balance!: string;

  @ApiProperty({
    example: 0.7198928571428571,
    description:
      "totalExpensesPaid / totalIncome, not rounded (0 when there's no income); 0.72 = 72%",
  })
  expenseRatio!: number;
}

export class ReportMonthDto {
  @ApiProperty({ example: "2026-09", description: "YYYY-MM" })
  month!: string;

  @ApiProperty({ example: "5200.00" })
  income!: string;

  @ApiProperty({ example: "3719.31" })
  expensesPaid!: string;

  @ApiProperty({ example: "1480.69" })
  balance!: string;
}

export class ReportCategoryDto {
  @ApiProperty({ example: "0b6f7a4e-6c1d-4f4f-9a41-5a8f3c2d1e90" })
  categoryId!: string;

  @ApiProperty({ example: "Mercado" })
  name!: string;

  @ApiProperty({ example: "#F59E0B" })
  color!: string;

  @ApiProperty({ example: "storefront-outline" })
  icon!: string;

  @ApiProperty({ example: "2150.40" })
  total!: string;
}

export class ReportWeekdayDto {
  @ApiProperty({
    type: "integer",
    example: 6,
    minimum: 0,
    maximum: 6,
    description: "0 = Sunday … 6 = Saturday",
  })
  weekday!: number;

  @ApiProperty({ example: "1830.25" })
  total!: string;
}

export class ReportTrendMonthDto {
  @ApiProperty({ example: "2026-09", description: "YYYY-MM" })
  month!: string;

  @ApiProperty({ example: "5200.00" })
  income!: string;

  @ApiProperty({ example: "3719.31" })
  expensesPaid!: string;
}

export class ReportDto {
  @ApiProperty({ example: "2026-07-01", format: "date", description: "The resolved range's start" })
  dateFrom!: string;

  @ApiProperty({ example: "2026-09-30", format: "date", description: "The resolved range's end" })
  dateTo!: string;

  @ApiProperty({ type: ReportSummaryDto })
  summary!: ReportSummaryDto;

  @ApiProperty({
    type: [ReportMonthDto],
    description: "Months with transactions in the range, oldest first",
  })
  monthly!: ReportMonthDto[];

  @ApiProperty({
    type: [ReportCategoryDto],
    maxItems: 5,
    description: "Up to 5, largest first (paid)",
  })
  topExpenseCategories!: ReportCategoryDto[];

  @ApiProperty({ type: [ReportCategoryDto], maxItems: 5, description: "Up to 5, largest first" })
  topIncomeCategories!: ReportCategoryDto[];

  @ApiProperty({
    type: [ReportWeekdayDto],
    minItems: 7,
    maxItems: 7,
    description: "Always 7 items, Sunday first (paid expenses in the range)",
  })
  expensesByWeekday!: ReportWeekdayDto[];

  @ApiProperty({
    type: [ReportTrendMonthDto],
    minItems: 12,
    maxItems: 12,
    description:
      "Always 12 items: the 11 months before the current one and the current month, oldest first; independent of the range",
  })
  last12Months!: ReportTrendMonthDto[];
}
