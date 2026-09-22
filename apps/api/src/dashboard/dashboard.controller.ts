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

import { DashboardService } from "./dashboard.service";
import { DashboardQueryDto } from "./dto/dashboard-query.dto";
import { DashboardDto } from "./dto/dashboard.dto";

@ApiTags("dashboard")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("dashboard")
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get()
  @ApiOperation({ summary: "Home screen summary for the current user's active workspace" })
  @ApiOkResponse({ type: DashboardDto })
  @ApiBadRequestResponse({ description: "period=custom without a valid dateFrom/dateTo range" })
  @ApiUnauthorizedResponse({ description: "Missing or invalid access token" })
  get(@CurrentUser() user: JwtPayload, @Query() query: DashboardQueryDto): Promise<DashboardDto> {
    return this.dashboardService.get(user.sub, query);
  }
}
