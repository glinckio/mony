import {
  CHANGELOG_DESCRIPTION_MAX,
  CHANGELOG_STATUSES,
  CHANGELOG_TITLE_MAX,
  youtubeVideoId,
  type ChangelogStatus,
} from "@mony/shared-types";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import {
  IsDateString,
  IsIn,
  IsOptional,
  IsString,
  Length,
  Matches,
  ValidateBy,
  ValidateIf,
  type ValidationOptions,
} from "class-validator";

import { DATE_ONLY_REGEX } from "../../common/utils/date.util";

const trim = ({ value }: { value: unknown }) => (typeof value === "string" ? value.trim() : value);

// A YouTube link (watch?v=, youtu.be/, shorts/, embed/) — the same rule the
// admin form applies (shared-types `youtubeVideoId`).
function IsYoutubeUrl(options?: ValidationOptions) {
  return ValidateBy(
    {
      name: "isYoutubeUrl",
      validator: {
        validate: (value: unknown) => typeof value === "string" && youtubeVideoId(value) !== null,
        defaultMessage: () => "videoUrl must be a YouTube video link.",
      },
    },
    options,
  );
}

// ---------------------------------------------------------------- responses

export class ChangelogEntryDto {
  @ApiProperty({ example: "8d1f3a52-2c4e-4b7a-9f10-6a2b3c4d5e6f" })
  id!: string;

  @ApiProperty({ example: "Relatórios chegaram" })
  title!: string;

  @ApiProperty({
    example: "Agora dá para ver o resumo do período, as categorias e a evolução do ano.",
    description: "Plain text (line breaks allowed); never HTML",
  })
  description!: string;

  @ApiProperty({ example: "dQw4w9WgXcQ", nullable: true, type: String })
  videoId!: string | null;

  @ApiProperty({ example: "2026-09-30T12:00:00.000Z" })
  publishedAt!: string;

  @ApiProperty({ example: "2026-12-31", format: "date", nullable: true, type: String })
  expiresAt!: string | null;

  @ApiProperty({
    example: null,
    nullable: true,
    type: String,
    description: "When this user read it (null = unread)",
  })
  readAt!: string | null;
}

export class ChangelogListDto {
  @ApiProperty({ type: [ChangelogEntryDto] })
  entries!: ChangelogEntryDto[];
}

export class ChangelogUnreadDto {
  @ApiProperty({
    type: ChangelogEntryDto,
    nullable: true,
    description: "The newest unread entry, or null when there's none",
  })
  entry!: ChangelogEntryDto | null;

  @ApiProperty({
    example: 2,
    type: "integer",
    minimum: 0,
    description: "How many unread entries there are, this one included",
  })
  total!: number;
}

export class AdminChangelogEntryDto {
  @ApiProperty({ example: "8d1f3a52-2c4e-4b7a-9f10-6a2b3c4d5e6f" })
  id!: string;

  @ApiProperty({ example: "Relatórios chegaram" })
  title!: string;

  @ApiProperty({
    example: "Agora dá para ver o resumo do período, as categorias e a evolução do ano.",
  })
  description!: string;

  @ApiProperty({ example: "dQw4w9WgXcQ", nullable: true, type: String })
  videoId!: string | null;

  @ApiProperty({ example: "2026-09-30T12:00:00.000Z" })
  publishedAt!: string;

  @ApiProperty({ example: "2026-12-31", format: "date", nullable: true, type: String })
  expiresAt!: string | null;

  @ApiProperty({ example: "ACTIVE", enum: CHANGELOG_STATUSES })
  status!: ChangelogStatus;

  @ApiProperty({ example: 42, type: "integer", description: "How many users marked it read" })
  readCount!: number;

  @ApiProperty({
    example: "Equipe Mony",
    nullable: true,
    type: String,
    description: "The author's name (null once their account is gone)",
  })
  authorName!: string | null;
}

// ---------------------------------------------------------------- inputs

export class CreateChangelogDto {
  @ApiProperty({ example: "Relatórios chegaram", minLength: 1, maxLength: CHANGELOG_TITLE_MAX })
  @Transform(trim)
  @IsString()
  @Length(1, CHANGELOG_TITLE_MAX)
  title!: string;

  @ApiProperty({
    example: "Agora dá para ver o resumo do período, as categorias e a evolução do ano.",
    minLength: 1,
    maxLength: CHANGELOG_DESCRIPTION_MAX,
    description: "Plain text; line breaks are kept",
  })
  @Transform(trim)
  @IsString()
  @Length(1, CHANGELOG_DESCRIPTION_MAX)
  description!: string;

  @ApiPropertyOptional({
    example: "https://youtu.be/dQw4w9WgXcQ",
    description: "A YouTube link (watch?v=, youtu.be/, shorts/, embed/); only the video id is kept",
  })
  @IsOptional()
  @Transform(trim)
  @IsYoutubeUrl()
  videoUrl?: string;

  @ApiPropertyOptional({
    example: "2026-12-31",
    format: "date",
    description: "Last day it's shown (inclusive)",
  })
  @IsOptional()
  @Matches(DATE_ONLY_REGEX, { message: "expiresAt must be a date in YYYY-MM-DD format." })
  @IsDateString({ strict: true })
  expiresAt?: string;
}

// `@IsOptional()` lets both null and undefined through: right for videoUrl
// and expiresAt, where null clears them. The required columns use
// `@ValidateIf(isProvided)` instead, so an explicit null is a 400 rather
// than a database error.
const isProvided = (_: unknown, value: unknown) => value !== undefined;

export class UpdateChangelogDto {
  @ApiPropertyOptional({
    example: "Relatórios chegaram",
    minLength: 1,
    maxLength: CHANGELOG_TITLE_MAX,
  })
  @ValidateIf(isProvided)
  @Transform(trim)
  @IsString()
  @Length(1, CHANGELOG_TITLE_MAX)
  title?: string;

  @ApiPropertyOptional({
    example: "Agora dá para ver o resumo do período.",
    minLength: 1,
    maxLength: CHANGELOG_DESCRIPTION_MAX,
  })
  @ValidateIf(isProvided)
  @Transform(trim)
  @IsString()
  @Length(1, CHANGELOG_DESCRIPTION_MAX)
  description?: string;

  @ApiPropertyOptional({
    example: "https://youtu.be/dQw4w9WgXcQ",
    nullable: true,
    type: String,
    description: "A YouTube link, or null to remove the video",
  })
  @IsOptional()
  @Transform(trim)
  @IsYoutubeUrl()
  videoUrl?: string | null;

  @ApiPropertyOptional({
    example: "2026-12-31",
    format: "date",
    nullable: true,
    type: String,
    description: "Last day it's shown, or null for no expiry",
  })
  @IsOptional()
  @Matches(DATE_ONLY_REGEX, { message: "expiresAt must be a date in YYYY-MM-DD format." })
  @IsDateString({ strict: true })
  expiresAt?: string | null;

  @ApiPropertyOptional({ example: "INACTIVE", enum: CHANGELOG_STATUSES })
  @ValidateIf(isProvided)
  @IsIn(CHANGELOG_STATUSES)
  status?: ChangelogStatus;
}
