import { ApiProperty } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import {
  IsEmail,
  IsOptional,
  IsString,
  Length,
  Matches,
  MaxLength,
  MinLength,
} from "class-validator";

import { Match } from "../../common/validators/match.decorator";

export class RegisterDto {
  @ApiProperty({ example: "Ada Lovelace", minLength: 1, maxLength: 100 })
  @IsString()
  @Length(1, 100)
  name!: string;

  @ApiProperty({ example: "ada@example.com", maxLength: 100 })
  @IsEmail()
  @MaxLength(100)
  email!: string;

  @ApiProperty({ example: "correcthorsebattery", minLength: 8, maxLength: 72 })
  @IsString()
  @MinLength(8)
  @MaxLength(72)
  password!: string;

  @ApiProperty({ example: "correcthorsebattery" })
  @IsString()
  @Match("password", { message: "passwordConfirmation must match password" })
  passwordConfirmation!: string;

  @ApiProperty({ example: "11987654321", required: false })
  @Transform(({ value }) => (value === "" ? undefined : value))
  @IsOptional()
  @Matches(/^\d{10,11}$/, { message: "phone must be 10-11 digits" })
  phone?: string;
}
