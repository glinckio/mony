import { ApiProperty } from "@nestjs/swagger";
import { IsDateString } from "class-validator";

export class SummaryQueryDto {
  @ApiProperty({ example: "2026-01-01" })
  @IsDateString()
  dateFrom!: string;

  @ApiProperty({ example: "2026-01-31" })
  @IsDateString()
  dateTo!: string;
}
