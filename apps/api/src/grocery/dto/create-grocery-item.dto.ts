import { GROCERY_CATEGORIES, MAX_GROCERY_DECIMAL, type GroceryCategory } from "@mony/shared-types";
import { ApiProperty } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import { IsIn, IsNumber, IsOptional, IsString, Length, Max, Min } from "class-validator";

const trim = ({ value }: { value: unknown }) => (typeof value === "string" ? value.trim() : value);

export class CreateGroceryItemDto {
  @ApiProperty({ example: "Arroz", minLength: 1, maxLength: 100 })
  @Transform(trim)
  @IsString()
  @Length(1, 100)
  name!: string;

  @ApiProperty({ example: "kg", minLength: 1, maxLength: 30 })
  @Transform(trim)
  @IsString()
  @Length(1, 30)
  unit!: string;

  @ApiProperty({ example: 5, minimum: 0, maximum: MAX_GROCERY_DECIMAL })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(MAX_GROCERY_DECIMAL)
  idealQuantity!: number;

  @ApiProperty({
    example: 1.5,
    minimum: 0,
    maximum: MAX_GROCERY_DECIMAL,
    required: false,
    default: 0,
  })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(MAX_GROCERY_DECIMAL)
  currentQuantity?: number;

  @ApiProperty({
    example: 6.49,
    minimum: 0,
    maximum: MAX_GROCERY_DECIMAL,
    description: "Per unit",
  })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(MAX_GROCERY_DECIMAL)
  estimatedPrice!: number;

  @ApiProperty({ example: "PANTRY", enum: GROCERY_CATEGORIES })
  @IsIn(GROCERY_CATEGORIES)
  category!: GroceryCategory;
}
