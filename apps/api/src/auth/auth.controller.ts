import { Body, Controller, HttpCode, HttpStatus, Post, UseGuards } from "@nestjs/common";
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiTooManyRequestsResponse,
  ApiUnauthorizedResponse,
} from "@nestjs/swagger";
import { Throttle } from "@nestjs/throttler";

import { AuthService } from "./auth.service";
import { AuthTokensDto } from "./dto/auth-tokens.dto";
import { ConfirmResetDto } from "./dto/confirm-reset.dto";
import { LoginDto } from "./dto/login.dto";
import { MessageDto } from "./dto/message.dto";
import { RefreshDto } from "./dto/refresh.dto";
import { RegisterDto } from "./dto/register.dto";
import { RequestResetDto } from "./dto/request-reset.dto";
import { JwtAuthGuard } from "./guards/jwt-auth.guard";
import { LoginThrottlerGuard } from "./guards/login-throttler.guard";
import { ResetThrottlerGuard } from "./guards/reset-throttler.guard";

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

  @Post("login")
  @UseGuards(LoginThrottlerGuard)
  @Throttle({ default: { limit: 10, ttl: 300_000 } })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Log in with email and password" })
  @ApiOkResponse({ type: AuthTokensDto })
  @ApiBadRequestResponse({ description: "Validation failed" })
  @ApiUnauthorizedResponse({ description: "Incorrect email or password" })
  @ApiForbiddenResponse({ description: "Account is not active" })
  @ApiTooManyRequestsResponse({ description: "Too many login attempts, try again later" })
  login(@Body() dto: LoginDto): Promise<AuthTokensDto> {
    return this.authService.login(dto);
  }

  @Post("refresh")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Exchange a refresh token for a new access/refresh pair" })
  @ApiOkResponse({ type: AuthTokensDto })
  @ApiBadRequestResponse({ description: "Validation failed" })
  @ApiUnauthorizedResponse({ description: "Invalid or expired refresh token" })
  refresh(@Body() dto: RefreshDto): Promise<AuthTokensDto> {
    return this.authService.refresh(dto);
  }

  @Post("password-reset/request")
  @UseGuards(ResetThrottlerGuard)
  @Throttle({ default: { limit: 5, ttl: 300_000 } })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Request a password reset code by email" })
  @ApiOkResponse({
    type: MessageDto,
    description: "Generic success — same response whether or not the email is registered",
  })
  @ApiBadRequestResponse({ description: "Validation failed" })
  @ApiTooManyRequestsResponse({ description: "Too many reset requests, try again later" })
  requestPasswordReset(@Body() dto: RequestResetDto): Promise<MessageDto> {
    return this.authService.requestPasswordReset(dto);
  }

  @Post("password-reset/confirm")
  @UseGuards(ResetThrottlerGuard)
  @Throttle({ default: { limit: 5, ttl: 300_000 } })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Confirm a password reset code and set a new password" })
  @ApiOkResponse({ type: MessageDto })
  @ApiBadRequestResponse({
    description: "Validation failed, or invalid/expired/already-used code",
  })
  @ApiTooManyRequestsResponse({ description: "Too many reset attempts, try again later" })
  confirmPasswordReset(@Body() dto: ConfirmResetDto): Promise<MessageDto> {
    return this.authService.confirmPasswordReset(dto);
  }

  @Post("logout")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: "Log out (client-side token clear — stateless JWT, no server session to revoke)",
  })
  @ApiNoContentResponse()
  @ApiUnauthorizedResponse({ description: "Missing or invalid access token" })
  logout(): void {
    // Stateless JWT: nothing to invalidate server-side. This endpoint
    // exists so the client has one consistent call, and so a future
    // server-side revocation list has a natural home.
  }
}
