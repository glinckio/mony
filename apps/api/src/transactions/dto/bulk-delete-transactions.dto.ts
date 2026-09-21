import { ApiProperty } from "@nestjs/swagger";
import { ArrayMinSize, IsArray, IsUUID } from "class-validator";

export class BulkDeleteTransactionsDto {
  @ApiProperty({ type: [String], example: ["5f8d0d55-6c3a-4b8e-9c2a-3f1e2d4b5a6c"] })
  @IsArray()
  @ArrayMinSize(1)
  @IsUUID("4", { each: true })
  ids!: string[];
}
