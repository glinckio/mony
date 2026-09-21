import { ApiProperty } from "@nestjs/swagger";

export class GoalDto {
  @ApiProperty({ example: "5f8d0d55-6c3a-4b8e-9c2a-3f1e2d4b5a6c" })
  id!: string;

  @ApiProperty({ example: "PERSONAL", enum: ["PERSONAL", "BUSINESS"] })
  workspace!: "PERSONAL" | "BUSINESS";

  @ApiProperty({ example: "a1826c76-8bbe-4dbe-a17d-d458df35c323", nullable: true })
  categoryId!: string | null;

  @ApiProperty({ example: "Viagem para a praia" })
  title!: string;

  @ApiProperty({ example: "Economizar para as férias de julho", nullable: true })
  description!: string | null;

  @ApiProperty({ example: "5000.00" })
  targetAmount!: string;

  @ApiProperty({ example: "1500.00" })
  currentAmount!: string;

  @ApiProperty({ example: "2026-07-01", nullable: true })
  targetDate!: string | null;

  @ApiProperty({ example: false })
  completed!: boolean;

  @ApiProperty({ example: 30, description: "min(100, max(0, currentAmount/targetAmount*100))" })
  progressPercent!: number;

  @ApiProperty({ example: "2026-01-15T12:00:00.000Z" })
  createdAt!: string;

  @ApiProperty({ example: "2026-01-15T12:00:00.000Z" })
  updatedAt!: string;
}
