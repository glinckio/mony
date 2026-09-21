import { ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsDateString, IsIn, IsInt, IsOptional, IsString, IsUUID, Max, MaxLength, Min } from "class-validator";

export class ListTransactionsQueryDto {
  @ApiPropertyOptional({ example: "EXPENSE", enum: ["INCOME", "EXPENSE"] })
  @IsOptional()
  @IsIn(["INCOME", "EXPENSE"])
  type?: "INCOME" | "EXPENSE";

  @ApiPropertyOptional({ example: "5f8d0d55-6c3a-4b8e-9c2a-3f1e2d4b5a6c" })
  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @ApiPropertyOptional({ example: "2026-01-01" })
  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @ApiPropertyOptional({ example: "2026-01-31" })
  @IsOptional()
  @IsDateString()
  dateTo?: string;

  @ApiPropertyOptional({ example: "PENDING", enum: ["PAID", "PENDING"] })
  @IsOptional()
  @IsIn(["PAID", "PENDING"])
  status?: "PAID" | "PENDING";

  @ApiPropertyOptional({ example: "aluguel", maxLength: 255 })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  search?: string;

  @ApiPropertyOptional({ example: 1, minimum: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @ApiPropertyOptional({ example: 20, minimum: 1, maximum: 100, default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  perPage: number = 20;

  @ApiPropertyOptional({ example: "date", enum: ["date", "amount", "description"] })
  @IsOptional()
  @IsIn(["date", "amount", "description"])
  sortBy?: "date" | "amount" | "description";

  @ApiPropertyOptional({ example: "desc", enum: ["asc", "desc"] })
  @IsOptional()
  @IsIn(["asc", "desc"])
  sortOrder?: "asc" | "desc";
}
