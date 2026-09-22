import { ApiProperty } from "@nestjs/swagger";

import { DashboardGoalPreviewDto } from "./dashboard-goal-preview.dto";
import { DashboardSummaryDto } from "./dashboard-summary.dto";
import { DashboardYearlyMonthDto } from "./dashboard-yearly-month.dto";

export class DashboardDto {
  @ApiProperty({ type: DashboardSummaryDto })
  summary!: DashboardSummaryDto;

  @ApiProperty({
    example: 12.5,
    nullable: true,
    description: "null when the previous equivalent period had 0 income",
  })
  previousPeriodIncomeChangePercent!: number | null;

  @ApiProperty({ example: "106.67" })
  averageDailyExpense!: string;

  @ApiProperty({ type: [DashboardGoalPreviewDto] })
  incompleteGoals!: DashboardGoalPreviewDto[];

  @ApiProperty({ type: [DashboardYearlyMonthDto] })
  yearlyBreakdown!: DashboardYearlyMonthDto[];
}
