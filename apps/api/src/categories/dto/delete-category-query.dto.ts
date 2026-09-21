import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsUUID } from "class-validator";

export class DeleteCategoryQueryDto {
  @ApiPropertyOptional({ example: "5f8d0d55-6c3a-4b8e-9c2a-3f1e2d4b5a6c" })
  @IsOptional()
  @IsUUID()
  replacementCategoryId?: string;
}
