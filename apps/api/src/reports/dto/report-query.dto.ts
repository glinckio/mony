import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsDateString, IsOptional, Matches } from "class-validator";

import { DATE_ONLY_REGEX } from "../../common/utils/date.util";

export class ReportQueryDto {
  @ApiPropertyOptional({
    example: "2026-07-01",
    format: "date",
    description:
      "Start of the range (inclusive), YYYY-MM-DD. Give both dates or neither (the current month).",
  })
  @IsOptional()
  @Matches(DATE_ONLY_REGEX, { message: "dateFrom must be a date in YYYY-MM-DD format." })
  @IsDateString({ strict: true })
  dateFrom?: string;

  @ApiPropertyOptional({
    example: "2026-09-30",
    format: "date",
    description:
      "End of the range (inclusive), YYYY-MM-DD. Give both dates or neither (the current month).",
  })
  @IsOptional()
  @Matches(DATE_ONLY_REGEX, { message: "dateTo must be a date in YYYY-MM-DD format." })
  @IsDateString({ strict: true })
  dateTo?: string;
}
