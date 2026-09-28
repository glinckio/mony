import { MAINTENANCE_RECEIPT_MAX_BYTES } from "@mony/shared-types";
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiConflictResponse,
  ApiConsumes,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiPayloadTooLargeResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from "@nestjs/swagger";

import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import type { JwtPayload } from "../auth/interfaces/jwt-payload.interface";

import { CreateMaintenanceRecordDto } from "./dto/create-maintenance-record.dto";
import { MaintenanceAlertStatusDto } from "./dto/maintenance-alert-status.dto";
import { MaintenanceRecordDto } from "./dto/maintenance-record.dto";
import { VehicleMaintenanceService, type UploadedReceipt } from "./vehicle-maintenance.service";

@ApiTags("vehicle-maintenance")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("vehicles/:vehicleId")
export class VehicleMaintenanceController {
  constructor(private readonly maintenanceService: VehicleMaintenanceService) {}

  @Get("maintenance-alerts")
  @ApiOperation({
    summary: "Live maintenance status of a vehicle, most urgent first",
    description:
      "One entry per maintenance type of the user. Status takes the more urgent of the km and time signals; never serviced = OVERDUE. Computed on every request, never stored.",
  })
  @ApiOkResponse({ type: [MaintenanceAlertStatusDto] })
  @ApiUnauthorizedResponse({ description: "Missing or invalid access token" })
  @ApiNotFoundResponse({ description: "Vehicle not found" })
  listAlerts(
    @CurrentUser() user: JwtPayload,
    @Param("vehicleId") vehicleId: string,
  ): Promise<MaintenanceAlertStatusDto[]> {
    return this.maintenanceService.listAlerts(user.sub, vehicleId);
  }

  @Get("maintenance-records")
  @ApiOperation({ summary: "A vehicle's maintenance history, newest first" })
  @ApiOkResponse({ type: [MaintenanceRecordDto] })
  @ApiUnauthorizedResponse({ description: "Missing or invalid access token" })
  @ApiNotFoundResponse({ description: "Vehicle not found" })
  listRecords(
    @CurrentUser() user: JwtPayload,
    @Param("vehicleId") vehicleId: string,
  ): Promise<MaintenanceRecordDto[]> {
    return this.maintenanceService.listRecords(user.sub, vehicleId);
  }

  @Post("maintenance-records")
  @ApiOperation({
    summary: "Register a completed maintenance",
    description:
      "Raises the vehicle's mileage if the service's is higher (never lowers it) and moves the type's alert to its latest record's mileage + kmInterval. A lower mileage is kept as a past service.",
  })
  @ApiCreatedResponse({ type: MaintenanceRecordDto })
  @ApiBadRequestResponse({
    description:
      "Validation failed, a date in the future, or maintenanceTypeId isn't one of the user's types",
  })
  @ApiUnauthorizedResponse({ description: "Missing or invalid access token" })
  @ApiNotFoundResponse({ description: "Vehicle not found" })
  createRecord(
    @CurrentUser() user: JwtPayload,
    @Param("vehicleId") vehicleId: string,
    @Body() dto: CreateMaintenanceRecordDto,
  ): Promise<MaintenanceRecordDto> {
    return this.maintenanceService.createRecord(user.sub, vehicleId, dto);
  }

  @Delete("maintenance-records/:id")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: "Delete a maintenance record (and its receipt)",
    description:
      "The type's alert is recalculated from the remaining records (none left: the vehicle's current mileage + kmInterval).",
  })
  @ApiNoContentResponse()
  @ApiUnauthorizedResponse({ description: "Missing or invalid access token" })
  @ApiNotFoundResponse({ description: "Vehicle or maintenance record not found" })
  deleteRecord(
    @CurrentUser() user: JwtPayload,
    @Param("vehicleId") vehicleId: string,
    @Param("id") id: string,
  ): Promise<void> {
    return this.maintenanceService.deleteRecord(user.sub, vehicleId, id);
  }

  @Put("maintenance-records/:id/receipt")
  @UseInterceptors(
    FileInterceptor("receipt", {
      limits: {
        // busboy treats reaching the limit as exceeding it, so +1 makes a
        // file of exactly 10 MB pass; the service re-checks <= 10 MB.
        fileSize: MAINTENANCE_RECEIPT_MAX_BYTES + 1,
        // Nothing but the one file (same reasoning as the vehicle photo).
        files: 1,
        fields: 0,
      },
    }),
  )
  @ApiOperation({
    summary: "Set (or replace) a maintenance record's receipt",
    description:
      "JPEG, PNG or WebP (stored re-encoded as JPEG, max 2560 px, all metadata such as EXIF/GPS removed) or a PDF (stored as uploaded), detected from the file content — name/declared type are ignored. Up to 10 MB. The previous receipt is deleted. Returns the record with a signed receipt URL.",
  })
  @ApiConsumes("multipart/form-data")
  @ApiBody({
    schema: {
      type: "object",
      required: ["receipt"],
      properties: { receipt: { type: "string", format: "binary" } },
    },
  })
  @ApiOkResponse({ type: MaintenanceRecordDto })
  @ApiBadRequestResponse({
    description:
      "No file, a file under a field other than 'receipt', more than one file, any extra form field, not a JPEG/PNG/WebP image or a complete PDF (%PDF- header and %%EOF trailer), or an image that can't be decoded",
  })
  @ApiPayloadTooLargeResponse({ description: "File larger than 10 MB" })
  @ApiUnauthorizedResponse({ description: "Missing or invalid access token" })
  @ApiNotFoundResponse({ description: "Vehicle or maintenance record not found" })
  @ApiConflictResponse({ description: "The receipt was changed by a concurrent request; retry" })
  setReceipt(
    @CurrentUser() user: JwtPayload,
    @Param("vehicleId") vehicleId: string,
    @Param("id") id: string,
    @UploadedFile() file: UploadedReceipt | undefined,
  ): Promise<MaintenanceRecordDto> {
    return this.maintenanceService.setReceipt(user.sub, vehicleId, id, file);
  }
}
