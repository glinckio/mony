import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  UseGuards,
} from "@nestjs/common";
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
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

import { CreateMaintenanceTypeDto } from "./dto/create-maintenance-type.dto";
import { MaintenanceTypeDto } from "./dto/maintenance-type.dto";
import { MaintenanceTypesService } from "./maintenance-types.service";

@ApiTags("vehicle-maintenance")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("maintenance-types")
export class MaintenanceTypesController {
  constructor(private readonly typesService: MaintenanceTypesService) {}

  @Get()
  @ApiOperation({
    summary: "List the current user's maintenance types",
    description:
      "Ordered by system (types without one last), then name. There are no system default types.",
  })
  @ApiOkResponse({ type: [MaintenanceTypeDto] })
  @ApiUnauthorizedResponse({ description: "Missing or invalid access token" })
  list(@CurrentUser() user: JwtPayload): Promise<MaintenanceTypeDto[]> {
    return this.typesService.list(user.sub);
  }

  @Post()
  @ApiOperation({
    summary: "Create a maintenance type",
    description:
      "Also creates its alert on every vehicle the user owns, due at the vehicle's current mileage + kmInterval.",
  })
  @ApiCreatedResponse({ type: MaintenanceTypeDto })
  @ApiBadRequestResponse({ description: "Validation failed" })
  @ApiUnauthorizedResponse({ description: "Missing or invalid access token" })
  create(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateMaintenanceTypeDto,
  ): Promise<MaintenanceTypeDto> {
    return this.typesService.create(user.sub, dto);
  }

  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: "Delete a maintenance type the current user owns (and its alerts)",
    description:
      "Refused while the type has maintenance records — history is never deleted implicitly.",
  })
  @ApiNoContentResponse()
  @ApiUnauthorizedResponse({ description: "Missing or invalid access token" })
  @ApiNotFoundResponse({ description: "Maintenance type not found" })
  @ApiConflictResponse({ description: "The type has maintenance records" })
  delete(@CurrentUser() user: JwtPayload, @Param("id") id: string): Promise<void> {
    return this.typesService.delete(user.sub, id);
  }
}
