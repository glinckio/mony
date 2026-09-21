import { Body, Controller, Get, HttpCode, HttpStatus, Patch, Post, UseGuards } from "@nestjs/common";
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from "@nestjs/swagger";

import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import type { JwtPayload } from "../auth/interfaces/jwt-payload.interface";

import { ChangePasswordDto } from "./dto/change-password.dto";
import { ProfileDto } from "./dto/profile.dto";
import { SwitchWorkspaceDto } from "./dto/switch-workspace.dto";
import { UpdateProfileDto } from "./dto/update-profile.dto";
import { UsersService } from "./users.service";

@ApiTags("users")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("users/me")
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @ApiOperation({ summary: "Get the current user's profile" })
  @ApiOkResponse({ type: ProfileDto })
  @ApiUnauthorizedResponse({ description: "Missing or invalid access token" })
  getProfile(@CurrentUser() user: JwtPayload): Promise<ProfileDto> {
    return this.usersService.getProfile(user.sub);
  }

  @Patch()
  @ApiOperation({ summary: "Update the current user's name, email, or phone numbers" })
  @ApiOkResponse({ type: ProfileDto })
  @ApiBadRequestResponse({ description: "Validation failed" })
  @ApiUnauthorizedResponse({ description: "Missing or invalid access token" })
  @ApiConflictResponse({ description: "Email already used by another account" })
  updateProfile(
    @CurrentUser() user: JwtPayload,
    @Body() dto: UpdateProfileDto,
  ): Promise<ProfileDto> {
    return this.usersService.updateProfile(user.sub, dto);
  }

  @Post("change-password")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Change the current user's password" })
  @ApiNoContentResponse()
  @ApiBadRequestResponse({ description: "Validation failed, or current password is incorrect" })
  @ApiUnauthorizedResponse({ description: "Missing or invalid access token" })
  changePassword(@CurrentUser() user: JwtPayload, @Body() dto: ChangePasswordDto): Promise<void> {
    return this.usersService.changePassword(user.sub, dto);
  }

  @Patch("workspace")
  @ApiOperation({ summary: "Switch the current user's active workspace" })
  @ApiOkResponse({ type: ProfileDto })
  @ApiBadRequestResponse({ description: "Validation failed" })
  @ApiUnauthorizedResponse({ description: "Missing or invalid access token" })
  switchWorkspace(
    @CurrentUser() user: JwtPayload,
    @Body() dto: SwitchWorkspaceDto,
  ): Promise<ProfileDto> {
    return this.usersService.switchWorkspace(user.sub, dto);
  }
}
