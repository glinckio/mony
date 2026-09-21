import { ApiProperty } from "@nestjs/swagger";
import { IsIn } from "class-validator";

export class UpdateTransactionStatusDto {
  @ApiProperty({ example: "PAID", enum: ["PAID", "PENDING"] })
  @IsIn(["PAID", "PENDING"])
  status!: "PAID" | "PENDING";
}
