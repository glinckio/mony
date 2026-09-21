import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsIn, IsOptional } from "class-validator";

export class ListCategoriesQueryDto {
  @ApiPropertyOptional({ example: "EXPENSE", enum: ["INCOME", "EXPENSE"] })
  @IsOptional()
  @IsIn(["INCOME", "EXPENSE"])
  type?: "INCOME" | "EXPENSE";
}
