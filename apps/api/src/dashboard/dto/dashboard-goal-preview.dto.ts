import { ApiProperty } from "@nestjs/swagger";

export class DashboardGoalPreviewDto {
  @ApiProperty({ example: "5f8d0d55-6c3a-4b8e-9c2a-3f1e2d4b5a6c" })
  id!: string;

  @ApiProperty({ example: "Viagem para a praia" })
  title!: string;

  @ApiProperty({ example: "5000.00" })
  targetAmount!: string;

  @ApiProperty({ example: "3000.00" })
  currentAmount!: string;

  @ApiProperty({ example: "2026-07-01", nullable: true })
  targetDate!: string | null;
}
