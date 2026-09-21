import { ApiProperty } from "@nestjs/swagger";

export class MessageDto {
  @ApiProperty({ example: "If this email is registered, you'll receive a reset code shortly." })
  message!: string;
}
