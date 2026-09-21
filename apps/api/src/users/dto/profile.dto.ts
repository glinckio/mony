import { ApiProperty } from "@nestjs/swagger";

export class ProfileDto {
  @ApiProperty({ example: "5f8d0d55-6c3a-4b8e-9c2a-3f1e2d4b5a6c" })
  id!: string;

  @ApiProperty({ example: "Ada Lovelace" })
  name!: string;

  @ApiProperty({ example: "ada@example.com" })
  email!: string;

  @ApiProperty({ example: "11987654321", nullable: true })
  phone!: string | null;

  @ApiProperty({ example: null, nullable: true })
  phone2!: string | null;

  @ApiProperty({ example: "PERSONAL", enum: ["PERSONAL", "BUSINESS"] })
  activeWorkspace!: "PERSONAL" | "BUSINESS";

  @ApiProperty({ example: "2026-01-15T12:00:00.000Z" })
  createdAt!: string;

  @ApiProperty({ example: "2026-09-20T08:30:00.000Z", nullable: true })
  lastAccessAt!: string | null;
}
