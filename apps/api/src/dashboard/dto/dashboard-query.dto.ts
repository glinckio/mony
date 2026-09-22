import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsDateString, IsIn, IsOptional } from "class-validator";

export class DashboardQueryDto {
  @ApiPropertyOptional({
    example: "month",
    enum: ["day", "week", "month", "custom"],
    default: "month",
  })
  @IsOptional()
  @IsIn(["day", "week", "month", "custom"])
  period: "day" | "week" | "month" | "custom" = "month";

  @ApiPropertyOptional({ example: "2026-01-01", description: "Required when period=custom" })
  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @ApiPropertyOptional({ example: "2026-01-31", description: "Required when period=custom" })
  @IsOptional()
  @IsDateString()
  dateTo?: string;
}
