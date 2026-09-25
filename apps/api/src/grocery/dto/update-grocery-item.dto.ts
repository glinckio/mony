import { GROCERY_CATEGORIES, MAX_GROCERY_DECIMAL, type GroceryCategory } from "@mony/shared-types";
import { ApiProperty } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import { IsIn, IsNumber, IsString, Length, Max, Min, ValidateIf } from "class-validator";

const trim = ({ value }: { value: unknown }) => (typeof value === "string" ? value.trim() : value);

// Every field is non-nullable: omitted = unchanged, and an explicit `null`
// fails validation (400) instead of reaching Prisma — `@IsOptional()`
// would let null through.
const isProvided = (_: unknown, value: unknown) => value !== undefined;

export class UpdateGroceryItemDto {
  @ApiProperty({ example: "Arroz", minLength: 1, maxLength: 100, required: false })
  @ValidateIf(isProvided)
  @Transform(trim)
  @IsString()
  @Length(1, 100)
  name?: string;

  @ApiProperty({ example: "kg", minLength: 1, maxLength: 30, required: false })
  @ValidateIf(isProvided)
  @Transform(trim)
  @IsString()
  @Length(1, 30)
  unit?: string;

  @ApiProperty({ example: 5, minimum: 0, maximum: MAX_GROCERY_DECIMAL, required: false })
  @ValidateIf(isProvided)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(MAX_GROCERY_DECIMAL)
  idealQuantity?: number;

  @ApiProperty({
    example: 3,
    minimum: 0,
    maximum: MAX_GROCERY_DECIMAL,
    required: false,
    description: "The mobile list's quick +/- stepper sends only this field.",
  })
  @ValidateIf(isProvided)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(MAX_GROCERY_DECIMAL)
  currentQuantity?: number;

  @ApiProperty({
    example: 6.49,
    minimum: 0,
    maximum: MAX_GROCERY_DECIMAL,
    required: false,
    description: "Per unit",
  })
  @ValidateIf(isProvided)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(MAX_GROCERY_DECIMAL)
  estimatedPrice?: number;

  @ApiProperty({ example: "PANTRY", enum: GROCERY_CATEGORIES, required: false })
  @ValidateIf(isProvided)
  @IsIn(GROCERY_CATEGORIES)
  category?: GroceryCategory;
}
