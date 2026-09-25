import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from "@nestjs/swagger";

import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import type { JwtPayload } from "../auth/interfaces/jwt-payload.interface";

import { DebtsService } from "./debts.service";
import { CreateDebtDto } from "./dto/create-debt.dto";
import { DebtWithInstallmentsDto } from "./dto/debt-with-installments.dto";
import { DebtDto } from "./dto/debt.dto";
import { ListDebtsQueryDto } from "./dto/list-debts-query.dto";
import { PayInstallmentDto } from "./dto/pay-installment.dto";
import { UpdateDebtDto } from "./dto/update-debt.dto";

@ApiTags("debts")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("debts")
export class DebtsController {
  constructor(private readonly debtsService: DebtsService) {}

  @Get()
  @ApiOperation({
    summary: "List the current user's debts in their active workspace",
    description:
      "ACTIVE debts with a pending installment past its due date are flipped to OVERDUE before listing.",
  })
  @ApiOkResponse({ type: [DebtDto] })
  @ApiBadRequestResponse({ description: "Validation failed" })
  @ApiUnauthorizedResponse({ description: "Missing or invalid access token" })
  list(@CurrentUser() user: JwtPayload, @Query() query: ListDebtsQueryDto): Promise<DebtDto[]> {
    return this.debtsService.list(user.sub, query.status);
  }

  @Get(":id")
  @ApiOperation({ summary: "Get a debt the current user owns, with its installments" })
  @ApiOkResponse({ type: DebtWithInstallmentsDto })
  @ApiUnauthorizedResponse({ description: "Missing or invalid access token" })
  @ApiNotFoundResponse({ description: "Debt not found" })
  findOne(@CurrentUser() user: JwtPayload, @Param("id") id: string): Promise<DebtWithInstallmentsDto> {
    return this.debtsService.findOne(user.sub, id);
  }

  @Post()
  @ApiOperation({
    summary: "Create a debt, generating its installments and their linked expense transactions",
  })
  @ApiCreatedResponse({ type: DebtWithInstallmentsDto })
  @ApiBadRequestResponse({
    description:
      "Validation failed, totalAmount below 0.01 per installment, endDate before startDate, categoryId is an income category, or no expense category exists to fall back to",
  })
  @ApiUnauthorizedResponse({ description: "Missing or invalid access token" })
  @ApiNotFoundResponse({ description: "Category not found" })
  create(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateDebtDto,
  ): Promise<DebtWithInstallmentsDto> {
    return this.debtsService.create(user.sub, dto);
  }

  @Patch(":id")
  @ApiOperation({ summary: "Update a debt the current user owns" })
  @ApiOkResponse({ type: DebtWithInstallmentsDto })
  @ApiBadRequestResponse({
    description:
      "Validation failed (incl. null for name/totalAmount/totalInstallments/startDate), endDate before startDate, categoryId is an income category, installment count or start date changed after an installment was paid, totalAmount changed once every installment is paid, totalAmount too low for the installments it must cover, or installments must be regenerated and no expense category exists to fall back to",
  })
  @ApiUnauthorizedResponse({ description: "Missing or invalid access token" })
  @ApiNotFoundResponse({ description: "Debt or category not found" })
  update(
    @CurrentUser() user: JwtPayload,
    @Param("id") id: string,
    @Body() dto: UpdateDebtDto,
  ): Promise<DebtWithInstallmentsDto> {
    return this.debtsService.update(user.sub, id, dto);
  }

  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Delete a debt, its installments, and their linked transactions" })
  @ApiNoContentResponse()
  @ApiUnauthorizedResponse({ description: "Missing or invalid access token" })
  @ApiNotFoundResponse({ description: "Debt not found" })
  delete(@CurrentUser() user: JwtPayload, @Param("id") id: string): Promise<void> {
    return this.debtsService.delete(user.sub, id);
  }

  @Post(":id/installments/:installmentId/pay")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Register payment of an installment (marks its linked transaction paid too)",
  })
  @ApiOkResponse({ type: DebtWithInstallmentsDto })
  @ApiBadRequestResponse({
    description:
      "Validation failed, the installment is already paid, or its linked transaction was deleted and no expense category exists to recreate it under",
  })
  @ApiUnauthorizedResponse({ description: "Missing or invalid access token" })
  @ApiNotFoundResponse({ description: "Debt or installment not found" })
  payInstallment(
    @CurrentUser() user: JwtPayload,
    @Param("id") id: string,
    @Param("installmentId") installmentId: string,
    @Body() dto: PayInstallmentDto,
  ): Promise<DebtWithInstallmentsDto> {
    return this.debtsService.payInstallment(user.sub, id, installmentId, dto);
  }

  @Post(":id/installments/:installmentId/cancel-payment")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Undo an installment's payment (its linked transaction goes back to pending)",
  })
  @ApiOkResponse({ type: DebtWithInstallmentsDto })
  @ApiBadRequestResponse({ description: "The installment isn't paid" })
  @ApiUnauthorizedResponse({ description: "Missing or invalid access token" })
  @ApiNotFoundResponse({ description: "Debt or installment not found" })
  cancelPayment(
    @CurrentUser() user: JwtPayload,
    @Param("id") id: string,
    @Param("installmentId") installmentId: string,
  ): Promise<DebtWithInstallmentsDto> {
    return this.debtsService.cancelPayment(user.sub, id, installmentId);
  }
}
