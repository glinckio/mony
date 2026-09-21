import { ApiProperty } from "@nestjs/swagger";
import { IsEmail, MaxLength } from "class-validator";

export class RequestResetDto {
  @ApiProperty({ example: "ada@example.com", maxLength: 100 })
  @IsEmail()
  @MaxLength(100)
  email!: string;
}
