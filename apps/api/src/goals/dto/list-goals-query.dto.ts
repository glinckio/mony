import { ApiPropertyOptional } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import { IsBoolean, IsOptional } from "class-validator";

export class ListGoalsQueryDto {
  @ApiPropertyOptional({ example: true })
  @IsOptional()
  // Explicit string->boolean mapping — `@Type(() => Boolean)` would
  // treat the literal string "false" as truthy (any non-empty string
  // is truthy in JS), silently breaking `?completed=false`.
  @Transform(({ value }) => {
    if (value === "true") return true;
    if (value === "false") return false;
    return value;
  })
  @IsBoolean()
  completed?: boolean;
}
