import { ApiProperty } from "@nestjs/swagger";

class AuthUserDto {
  @ApiProperty({ example: "5f8d0d55-6c3a-4b8e-9c2a-3f1e2d4b5a6c" })
  id!: string;

  @ApiProperty({ example: "Ada Lovelace" })
  name!: string;

  @ApiProperty({ example: "ada@example.com" })
  email!: string;

  @ApiProperty({ example: "PERSONAL", enum: ["PERSONAL", "BUSINESS"] })
  activeWorkspace!: "PERSONAL" | "BUSINESS";
}

export class AuthTokensDto {
  @ApiProperty({ example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." })
  accessToken!: string;

  @ApiProperty({ example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." })
  refreshToken!: string;

  @ApiProperty({ type: AuthUserDto })
  user!: AuthUserDto;
}
