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

import { CategoriesService } from "./categories.service";
import { CategoryDto } from "./dto/category.dto";
import { CreateCategoryDto } from "./dto/create-category.dto";
import { DeleteCategoryQueryDto } from "./dto/delete-category-query.dto";
import { ListCategoriesQueryDto } from "./dto/list-categories-query.dto";
import { UpdateCategoryDto } from "./dto/update-category.dto";

@ApiTags("categories")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("categories")
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Get()
  @ApiOperation({ summary: "List the current user's categories, sorted by name" })
  @ApiOkResponse({ type: [CategoryDto] })
  @ApiBadRequestResponse({ description: "Validation failed" })
  @ApiUnauthorizedResponse({ description: "Missing or invalid access token" })
  list(
    @CurrentUser() user: JwtPayload,
    @Query() query: ListCategoriesQueryDto,
  ): Promise<CategoryDto[]> {
    return this.categoriesService.list(user.sub, query.type);
  }

  @Post()
  @ApiOperation({ summary: "Create a category" })
  @ApiCreatedResponse({ type: CategoryDto })
  @ApiBadRequestResponse({ description: "Validation failed" })
  @ApiUnauthorizedResponse({ description: "Missing or invalid access token" })
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreateCategoryDto): Promise<CategoryDto> {
    return this.categoriesService.create(user.sub, dto);
  }

  @Patch(":id")
  @ApiOperation({ summary: "Update a category the current user owns" })
  @ApiOkResponse({ type: CategoryDto })
  @ApiBadRequestResponse({ description: "Validation failed" })
  @ApiUnauthorizedResponse({ description: "Missing or invalid access token" })
  @ApiNotFoundResponse({ description: "Category doesn't exist or isn't owned by this user" })
  update(
    @CurrentUser() user: JwtPayload,
    @Param("id") id: string,
    @Body() dto: UpdateCategoryDto,
  ): Promise<CategoryDto> {
    return this.categoriesService.update(user.sub, id, dto);
  }

  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: "Delete a category the current user owns",
    description:
      "With replacementCategoryId, the category's transactions AND debts are reassigned to the replacement first. Without it, debts still pointing at the category keep existing with categoryId = null.",
  })
  @ApiNoContentResponse()
  @ApiBadRequestResponse({
    description:
      "Validation failed, the category has transactions and no replacementCategoryId was given, or the replacement is the same category or of a different type",
  })
  @ApiUnauthorizedResponse({ description: "Missing or invalid access token" })
  @ApiNotFoundResponse({ description: "Category doesn't exist or isn't owned by this user" })
  delete(
    @CurrentUser() user: JwtPayload,
    @Param("id") id: string,
    @Query() query: DeleteCategoryQueryDto,
  ): Promise<void> {
    return this.categoriesService.delete(user.sub, id, query.replacementCategoryId);
  }
}
