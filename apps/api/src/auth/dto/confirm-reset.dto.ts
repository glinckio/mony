import { ApiProperty } from "@nestjs/swagger";
import { IsEmail, IsString, Length, MaxLength, MinLength } from "class-validator";

import { Match } from "../../common/validators/match.decorator";

export class ConfirmResetDto {
  @ApiProperty({ example: "ada@example.com", maxLength: 100 })
  @IsEmail()
  @MaxLength(100)
  email!: string;

  @ApiProperty({ example: "123456", minLength: 6, maxLength: 6 })
  @IsString()
  @Length(6, 6)
  code!: string;

  @ApiProperty({ example: "correcthorsebattery", minLength: 8, maxLength: 72 })
  @IsString()
  @MinLength(8)
  @MaxLength(72)
  newPassword!: string;

  @ApiProperty({ example: "correcthorsebattery" })
  @IsString()
  @Match("newPassword", { message: "newPasswordConfirmation must match newPassword" })
  newPasswordConfirmation!: string;
}
