import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from "@nestjs/common";
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from "@nestjs/swagger";

import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { AdminGuard } from "../auth/guards/admin.guard";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import type { JwtPayload } from "../auth/interfaces/jwt-payload.interface";

import { ChangelogService } from "./changelog.service";
import {
  AdminChangelogEntryDto,
  ChangelogListDto,
  ChangelogUnreadDto,
  CreateChangelogDto,
  UpdateChangelogDto,
} from "./dto/changelog.dto";

@ApiTags("changelog")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@ApiUnauthorizedResponse({ description: "Missing or invalid access token" })
@Controller("changelog")
export class ChangelogController {
  constructor(private readonly changelog: ChangelogService) {}

  @Get("unread")
  @ApiOperation({
    summary: "The user's newest unread news entry and how many are waiting",
    description:
      "Among active, not expired entries published at or after the user signed up that they haven't marked read: the newest one (the app opens it on Início, legacy's popup) and the total, that one included.",
  })
  @ApiOkResponse({ type: ChangelogUnreadDto })
  async unread(@CurrentUser() user: JwtPayload): Promise<ChangelogUnreadDto> {
    return this.changelog.unread(user.sub);
  }

  @Get()
  @ApiOperation({
    summary: "Every news entry visible to the user, newest first",
    description: "Same visibility as /changelog/unread, read or not; readAt says when it was read.",
  })
  @ApiOkResponse({ type: ChangelogListDto })
  async history(@CurrentUser() user: JwtPayload): Promise<ChangelogListDto> {
    return { entries: await this.changelog.history(user.sub) };
  }

  @Post(":id/read")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: "Mark a news entry read",
    description: "Idempotent: marking it again keeps the first read time.",
  })
  @ApiNoContentResponse({ description: "Marked read (or already was)" })
  @ApiBadRequestResponse({ description: "id is not a UUID" })
  @ApiNotFoundResponse({ description: "No such entry visible to this user" })
  async markRead(
    @CurrentUser() user: JwtPayload,
    @Param("id", ParseUUIDPipe) id: string,
  ): Promise<void> {
    await this.changelog.markRead(user.sub, id);
  }
}

@ApiTags("changelog (admin)")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, AdminGuard)
@ApiUnauthorizedResponse({ description: "Missing or invalid access token" })
@ApiForbiddenResponse({ description: "The caller isn't an admin (checked in the database)" })
@Controller("admin/changelog")
export class AdminChangelogController {
  constructor(private readonly changelog: ChangelogService) {}

  @Get()
  @ApiOperation({
    summary: "Every news entry, newest first (any status, expired or not)",
    description: "With the number of readers and the author's name.",
  })
  @ApiOkResponse({ type: [AdminChangelogEntryDto] })
  list(): Promise<AdminChangelogEntryDto[]> {
    return this.changelog.adminList();
  }

  @Post()
  @ApiOperation({
    summary: "Publish a news entry",
    description: "Published now and active, with the caller as author.",
  })
  @ApiCreatedResponse({ type: AdminChangelogEntryDto })
  @ApiBadRequestResponse({
    description:
      "Validation failed (title 1–150, text 1–5000, videoUrl a YouTube link, expiresAt YYYY-MM-DD)",
  })
  create(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateChangelogDto,
  ): Promise<AdminChangelogEntryDto> {
    return this.changelog.create(user.sub, dto);
  }

  @Patch(":id")
  @ApiOperation({
    summary: "Edit a news entry",
    description:
      "Title, text, video, expiry date and status; the publication date doesn't change. null removes the video / expiry.",
  })
  @ApiOkResponse({ type: AdminChangelogEntryDto })
  @ApiBadRequestResponse({ description: "Validation failed, or id is not a UUID" })
  @ApiNotFoundResponse({ description: "No such entry" })
  update(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: UpdateChangelogDto,
  ): Promise<AdminChangelogEntryDto> {
    return this.changelog.update(id, dto);
  }

  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Delete a news entry", description: "Its read records go with it." })
  @ApiNoContentResponse({ description: "Deleted" })
  @ApiBadRequestResponse({ description: "id is not a UUID" })
  @ApiNotFoundResponse({ description: "No such entry" })
  async remove(@Param("id", ParseUUIDPipe) id: string): Promise<void> {
    await this.changelog.delete(id);
  }
}
