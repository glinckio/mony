import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from "@nestjs/swagger";

import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import type { JwtPayload } from "../auth/interfaces/jwt-payload.interface";

import { ReportQueryDto } from "./dto/report-query.dto";
import { ReportDto } from "./dto/report.dto";
import { ReportsService } from "./reports.service";

@ApiTags("reports")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("reports")
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get()
  @ApiOperation({
    summary: "Financial reports for a date range in the active workspace",
    description:
      "Period summary, per-month totals, top 5 expense and income categories, expenses by weekday (all for the range; default: the current month) and the last 12 months (always ending with the current month). Expenses count only when paid.",
  })
  @ApiOkResponse({ type: ReportDto, description: "The report for the resolved range" })
  @ApiBadRequestResponse({
    description:
      "Only one of dateFrom/dateTo; a date that is empty, not in YYYY-MM-DD format or not a real calendar day (e.g. 2026-02-30); dateFrom after dateTo; or an unknown query parameter",
  })
  @ApiUnauthorizedResponse({ description: "Missing or invalid access token" })
  get(@CurrentUser() user: JwtPayload, @Query() query: ReportQueryDto): Promise<ReportDto> {
    return this.reportsService.get(user.sub, query);
  }
}
