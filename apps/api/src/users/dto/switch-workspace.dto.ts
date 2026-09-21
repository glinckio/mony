import { ApiProperty } from "@nestjs/swagger";
import { IsIn } from "class-validator";

export class SwitchWorkspaceDto {
  @ApiProperty({ example: "BUSINESS", enum: ["PERSONAL", "BUSINESS"] })
  @IsIn(["PERSONAL", "BUSINESS"])
  workspace!: "PERSONAL" | "BUSINESS";
}
