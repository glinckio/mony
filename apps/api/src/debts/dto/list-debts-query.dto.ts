import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsIn, IsOptional } from "class-validator";

export class ListDebtsQueryDto {
  @ApiPropertyOptional({ example: "ACTIVE", enum: ["ACTIVE", "PAID_OFF", "OVERDUE"] })
  @IsOptional()
  @IsIn(["ACTIVE", "PAID_OFF", "OVERDUE"])
  status?: "ACTIVE" | "PAID_OFF" | "OVERDUE";
}
