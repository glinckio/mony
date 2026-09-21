import { ApiProperty } from "@nestjs/swagger";
import { IsString, MaxLength, MinLength } from "class-validator";

import { Match } from "../../common/validators/match.decorator";

export class ChangePasswordDto {
  @ApiProperty({ example: "correcthorsebattery" })
  @IsString()
  @MinLength(1)
  currentPassword!: string;

  @ApiProperty({ example: "newcorrecthorsebattery", minLength: 8, maxLength: 72 })
  @IsString()
  @MinLength(8)
  @MaxLength(72)
  newPassword!: string;

  @ApiProperty({ example: "newcorrecthorsebattery" })
  @IsString()
  @Match("newPassword", { message: "newPasswordConfirmation must match newPassword" })
  newPasswordConfirmation!: string;
}
