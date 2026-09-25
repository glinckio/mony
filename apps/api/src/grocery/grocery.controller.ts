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

import { CreateGroceryItemDto } from "./dto/create-grocery-item.dto";
import { GroceryBudgetDto } from "./dto/grocery-budget.dto";
import { GroceryItemDto } from "./dto/grocery-item.dto";
import { GrocerySummaryDto } from "./dto/grocery-summary.dto";
import { SetGroceryBudgetDto } from "./dto/set-grocery-budget.dto";
import { UpdateGroceryItemDto } from "./dto/update-grocery-item.dto";
import { GroceryService } from "./grocery.service";

@ApiTags("grocery")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("grocery")
export class GroceryController {
  constructor(private readonly groceryService: GroceryService) {}

  @Get("items")
  @ApiOperation({
    summary: "List the current user's grocery items, ordered by category then name",
    description: "Not workspace-scoped — the grocery list is per user.",
  })
  @ApiOkResponse({ type: [GroceryItemDto] })
  @ApiUnauthorizedResponse({ description: "Missing or invalid access token" })
  listItems(@CurrentUser() user: JwtPayload): Promise<GroceryItemDto[]> {
    return this.groceryService.listItems(user.sub);
  }

  @Post("items")
  @ApiOperation({ summary: "Add a grocery item" })
  @ApiCreatedResponse({ type: GroceryItemDto })
  @ApiBadRequestResponse({ description: "Validation failed" })
  @ApiUnauthorizedResponse({ description: "Missing or invalid access token" })
  createItem(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateGroceryItemDto,
  ): Promise<GroceryItemDto> {
    return this.groceryService.createItem(user.sub, dto);
  }

  @Patch("items/:id")
  @ApiOperation({
    summary: "Update a grocery item the current user owns (also used for the quick +/- stepper)",
  })
  @ApiOkResponse({ type: GroceryItemDto })
  @ApiBadRequestResponse({ description: "Validation failed (including an explicit null)" })
  @ApiUnauthorizedResponse({ description: "Missing or invalid access token" })
  @ApiNotFoundResponse({ description: "Grocery item not found" })
  updateItem(
    @CurrentUser() user: JwtPayload,
    @Param("id") id: string,
    @Body() dto: UpdateGroceryItemDto,
  ): Promise<GroceryItemDto> {
    return this.groceryService.updateItem(user.sub, id, dto);
  }

  @Delete("items/:id")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Delete a grocery item the current user owns" })
  @ApiNoContentResponse()
  @ApiUnauthorizedResponse({ description: "Missing or invalid access token" })
  @ApiNotFoundResponse({ description: "Grocery item not found" })
  deleteItem(@CurrentUser() user: JwtPayload, @Param("id") id: string): Promise<void> {
    return this.groceryService.deleteItem(user.sub, id);
  }

  @Get("budget")
  @ApiOperation({
    summary: "Current (most recently set) monthly grocery budget",
    description: "Informational only — never enforced. amount/setAt are null if never set.",
  })
  @ApiOkResponse({ type: GroceryBudgetDto })
  @ApiUnauthorizedResponse({ description: "Missing or invalid access token" })
  getBudget(@CurrentUser() user: JwtPayload): Promise<GroceryBudgetDto> {
    return this.groceryService.getBudget(user.sub);
  }

  @Post("budget")
  @ApiOperation({
    summary: "Set the monthly grocery budget",
    description:
      "Always records a new entry (history kept); the newest entry is the current budget.",
  })
  @ApiCreatedResponse({ type: GroceryBudgetDto })
  @ApiBadRequestResponse({ description: "Validation failed" })
  @ApiUnauthorizedResponse({ description: "Missing or invalid access token" })
  setBudget(
    @CurrentUser() user: JwtPayload,
    @Body() dto: SetGroceryBudgetDto,
  ): Promise<GroceryBudgetDto> {
    return this.groceryService.setBudget(user.sub, dto);
  }

  @Get("summary")
  @ApiOperation({
    summary: "Item counts and the estimated cost of buying everything that's missing",
  })
  @ApiOkResponse({ type: GrocerySummaryDto })
  @ApiUnauthorizedResponse({ description: "Missing or invalid access token" })
  summary(@CurrentUser() user: JwtPayload): Promise<GrocerySummaryDto> {
    return this.groceryService.summary(user.sub);
  }
}
