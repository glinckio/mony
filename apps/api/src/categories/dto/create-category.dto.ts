import { CATEGORY_ICONS } from "@mony/shared-types";
import { ApiProperty } from "@nestjs/swagger";
import { IsIn, IsOptional, IsString, Length, Matches } from "class-validator";

export class CreateCategoryDto {
  @ApiProperty({ example: "Alimentação", minLength: 1, maxLength: 50 })
  @IsString()
  @Length(1, 50)
  name!: string;

  @ApiProperty({ example: "EXPENSE", enum: ["INCOME", "EXPENSE"] })
  @IsIn(["INCOME", "EXPENSE"])
  type!: "INCOME" | "EXPENSE";

  @ApiProperty({ example: "#3B82F6", required: false })
  @IsOptional()
  @Matches(/^#[0-9A-Fa-f]{6}$/, { message: "color must be a hex string like #3B82F6" })
  color?: string;

  @ApiProperty({ example: "restaurant-outline", enum: CATEGORY_ICONS })
  @IsIn(CATEGORY_ICONS)
  icon!: string;
}
