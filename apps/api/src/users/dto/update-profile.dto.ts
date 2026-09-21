import { ApiProperty } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import { IsEmail, IsOptional, IsString, Length, Matches, MaxLength } from "class-validator";

export class UpdateProfileDto {
  @ApiProperty({ example: "Ada Lovelace", minLength: 1, maxLength: 100, required: false })
  @IsOptional()
  @IsString()
  @Length(1, 100)
  name?: string;

  @ApiProperty({ example: "ada@example.com", maxLength: 100, required: false })
  @IsOptional()
  @IsEmail()
  @MaxLength(100)
  email?: string;

  @ApiProperty({ example: "11987654321", required: false })
  @Transform(({ value }) => (value === "" ? undefined : value))
  @IsOptional()
  @Matches(/^\d{10,11}$/, { message: "phone must be 10-11 digits" })
  phone?: string;

  @ApiProperty({ example: "11912345678", required: false })
  @Transform(({ value }) => (value === "" ? undefined : value))
  @IsOptional()
  @Matches(/^\d{10,11}$/, { message: "phone2 must be 10-11 digits" })
  phone2?: string;
}
