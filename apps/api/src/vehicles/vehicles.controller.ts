import { VEHICLE_PHOTO_MAX_BYTES } from "@mony/shared-types";
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

import { CreateVehicleDto } from "./dto/create-vehicle.dto";
import { UpdateVehicleDto } from "./dto/update-vehicle.dto";
import { VehicleDto } from "./dto/vehicle.dto";
import { VehiclesService, type UploadedPhoto } from "./vehicles.service";

@ApiTags("vehicles")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("vehicles")
export class VehiclesController {
  constructor(private readonly vehiclesService: VehiclesService) {}

  @Get()
  @ApiOperation({
    summary: "List the current user's vehicles, newest first",
    description: "Not workspace-scoped — vehicles are per user.",
  })
  @ApiOkResponse({ type: [VehicleDto] })
  @ApiUnauthorizedResponse({ description: "Missing or invalid access token" })
  list(@CurrentUser() user: JwtPayload): Promise<VehicleDto[]> {
    return this.vehiclesService.list(user.sub);
  }

  @Get(":id")
  @ApiOperation({ summary: "Get a vehicle the current user owns" })
  @ApiOkResponse({ type: VehicleDto })
  @ApiUnauthorizedResponse({ description: "Missing or invalid access token" })
  @ApiNotFoundResponse({ description: "Vehicle not found" })
  findOne(@CurrentUser() user: JwtPayload, @Param("id") id: string): Promise<VehicleDto> {
    return this.vehiclesService.findOne(user.sub, id);
  }

  @Post()
  @ApiOperation({ summary: "Register a vehicle" })
  @ApiCreatedResponse({ type: VehicleDto })
  @ApiBadRequestResponse({
    description: "Validation failed, a year after next year, or modelYear < manufactureYear",
  })
  @ApiUnauthorizedResponse({ description: "Missing or invalid access token" })
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreateVehicleDto): Promise<VehicleDto> {
    return this.vehiclesService.create(user.sub, dto);
  }

  @Patch(":id")
  @ApiOperation({ summary: "Update a vehicle the current user owns (including its mileage)" })
  @ApiOkResponse({ type: VehicleDto })
  @ApiBadRequestResponse({
    description:
      "Validation failed (including an explicit null on a required field), the new mileage is lower than the stored one, a year after next year, or modelYear < manufactureYear",
  })
  @ApiUnauthorizedResponse({ description: "Missing or invalid access token" })
  @ApiNotFoundResponse({ description: "Vehicle not found" })
  update(
    @CurrentUser() user: JwtPayload,
    @Param("id") id: string,
    @Body() dto: UpdateVehicleDto,
  ): Promise<VehicleDto> {
    return this.vehiclesService.update(user.sub, id, dto);
  }

  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Delete a vehicle the current user owns (and its stored photo)" })
  @ApiNoContentResponse()
  @ApiUnauthorizedResponse({ description: "Missing or invalid access token" })
  @ApiNotFoundResponse({ description: "Vehicle not found" })
  delete(@CurrentUser() user: JwtPayload, @Param("id") id: string): Promise<void> {
    return this.vehiclesService.delete(user.sub, id);
  }

  @Put(":id/photo")
  @UseInterceptors(
    FileInterceptor("photo", {
      limits: {
        // busboy treats reaching the limit as exceeding it, so +1 makes a
        // file of exactly 5 MB pass; the service re-checks <= 5 MB.
        fileSize: VEHICLE_PHOTO_MAX_BYTES + 1,
        // Nothing but the one file: any text field is rejected before being
        // buffered, and a second file trips `files`. (No `parts` limit —
        // busboy fires it on *reaching* the count, which would reject the
        // single legitimate part too.)
        files: 1,
        fields: 0,
      },
    }),
  )
  @ApiOperation({
    summary: "Set (or replace) the vehicle's photo",
    description:
      "JPEG, PNG or WebP, detected from the file content (name/declared type are ignored), up to 5 MB. Stored re-encoded as JPEG (max 1600 px, all metadata such as EXIF/GPS removed). The previous photo is deleted. Returns the vehicle with a signed photoUrl.",
  })
  @ApiConsumes("multipart/form-data")
  @ApiBody({
    schema: {
      type: "object",
      required: ["photo"],
      properties: { photo: { type: "string", format: "binary" } },
    },
  })
  @ApiOkResponse({ type: VehicleDto })
  @ApiBadRequestResponse({
    description:
      "No file, a file under a field other than 'photo', more than one file, any extra form field, not a JPEG/PNG/WebP image, or an image that can't be decoded",
  })
  @ApiPayloadTooLargeResponse({ description: "File larger than 5 MB" })
  @ApiUnauthorizedResponse({ description: "Missing or invalid access token" })
  @ApiNotFoundResponse({ description: "Vehicle not found" })
  @ApiConflictResponse({ description: "The photo was changed by a concurrent request; retry" })
  setPhoto(
    @CurrentUser() user: JwtPayload,
    @Param("id") id: string,
    @UploadedFile() file: UploadedPhoto | undefined,
  ): Promise<VehicleDto> {
    return this.vehiclesService.setPhoto(user.sub, id, file);
  }

  @Delete(":id/photo")
  @ApiOperation({ summary: "Remove the vehicle's photo" })
  @ApiOkResponse({ type: VehicleDto })
  @ApiUnauthorizedResponse({ description: "Missing or invalid access token" })
  @ApiNotFoundResponse({ description: "Vehicle not found" })
  @ApiConflictResponse({ description: "The photo was changed by a concurrent request; retry" })
  removePhoto(@CurrentUser() user: JwtPayload, @Param("id") id: string): Promise<VehicleDto> {
    return this.vehiclesService.removePhoto(user.sub, id);
  }
}
