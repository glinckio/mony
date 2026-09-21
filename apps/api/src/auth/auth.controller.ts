import { Body, Controller, HttpCode, HttpStatus, Post } from "@nestjs/common";
import {
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiOperation,
  ApiTags,
} from "@nestjs/swagger";

import { AuthService } from "./auth.service";
import { AuthTokensDto } from "./dto/auth-tokens.dto";
import { RegisterDto } from "./dto/register.dto";

@ApiTags("auth")
@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post("register")
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: "Create a new account and log in immediately" })
  @ApiCreatedResponse({ type: AuthTokensDto })
  @ApiBadRequestResponse({
    description:
      "Validation failed (weak password, mismatched confirmation, malformed email/phone, etc.)",
  })
  @ApiConflictResponse({ description: "Email already registered" })
  register(@Body() dto: RegisterDto): Promise<AuthTokensDto> {
    return this.authService.register(dto);
  }
}
