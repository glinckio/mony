import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from "@nestjs/swagger";

import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import type { JwtPayload } from "../auth/interfaces/jwt-payload.interface";

import { CreateGoalDto } from "./dto/create-goal.dto";
import { GoalDto } from "./dto/goal.dto";
import { ListGoalsQueryDto } from "./dto/list-goals-query.dto";
import { UpdateGoalDto } from "./dto/update-goal.dto";
import { GoalsService } from "./goals.service";

@ApiTags("goals")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("goals")
export class GoalsController {
  constructor(private readonly goalsService: GoalsService) {}

  @Get()
  @ApiOperation({ summary: "List the current user's goals in their active workspace" })
  @ApiOkResponse({ type: [GoalDto] })
  @ApiBadRequestResponse({ description: "Validation failed" })
  @ApiUnauthorizedResponse({ description: "Missing or invalid access token" })
  list(@CurrentUser() user: JwtPayload, @Query() query: ListGoalsQueryDto): Promise<GoalDto[]> {
    return this.goalsService.list(user.sub, query.completed);
  }

  @Post()
  @ApiOperation({ summary: "Create a goal" })
  @ApiCreatedResponse({ type: GoalDto })
  @ApiBadRequestResponse({ description: "Validation failed" })
  @ApiUnauthorizedResponse({ description: "Missing or invalid access token" })
  @ApiNotFoundResponse({ description: "Category not found" })
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreateGoalDto): Promise<GoalDto> {
    return this.goalsService.create(user.sub, dto);
  }

  @Patch(":id")
  @ApiOperation({
    summary: "Update a goal the current user owns (progress, completion, or details)",
  })
  @ApiOkResponse({ type: GoalDto })
  @ApiBadRequestResponse({ description: "Validation failed" })
  @ApiUnauthorizedResponse({ description: "Missing or invalid access token" })
  @ApiNotFoundResponse({ description: "Goal or category not found" })
  update(
    @CurrentUser() user: JwtPayload,
    @Param("id") id: string,
    @Body() dto: UpdateGoalDto,
  ): Promise<GoalDto> {
    return this.goalsService.update(user.sub, id, dto);
  }

  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Delete a goal the current user owns" })
  @ApiNoContentResponse()
  @ApiUnauthorizedResponse({ description: "Missing or invalid access token" })
  @ApiNotFoundResponse({ description: "Goal not found" })
  delete(@CurrentUser() user: JwtPayload, @Param("id") id: string): Promise<void> {
    return this.goalsService.delete(user.sub, id);
  }
}
