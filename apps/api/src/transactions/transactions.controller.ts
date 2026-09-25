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

import { BulkDeleteTransactionsDto } from "./dto/bulk-delete-transactions.dto";
import { CreateTransactionDto } from "./dto/create-transaction.dto";
import { ListTransactionsQueryDto } from "./dto/list-transactions-query.dto";
import { PaginatedTransactionsDto } from "./dto/paginated-transactions.dto";
import { SummaryQueryDto } from "./dto/summary-query.dto";
import { TransactionSummaryDto } from "./dto/transaction-summary.dto";
import { TransactionDto } from "./dto/transaction.dto";
import { UpdateTransactionStatusDto } from "./dto/update-transaction-status.dto";
import { UpdateTransactionDto } from "./dto/update-transaction.dto";
import { TransactionsService } from "./transactions.service";

@ApiTags("transactions")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("transactions")
export class TransactionsController {
  constructor(private readonly transactionsService: TransactionsService) {}

  @Get()
  @ApiOperation({ summary: "List the current user's transactions in their active workspace" })
  @ApiOkResponse({ type: PaginatedTransactionsDto })
  @ApiBadRequestResponse({ description: "Validation failed" })
  @ApiUnauthorizedResponse({ description: "Missing or invalid access token" })
  list(
    @CurrentUser() user: JwtPayload,
    @Query() query: ListTransactionsQueryDto,
  ): Promise<PaginatedTransactionsDto> {
    return this.transactionsService.list(user.sub, query);
  }

  @Get("summary")
  @ApiOperation({ summary: "Financial summary for a date range in the active workspace" })
  @ApiOkResponse({ type: TransactionSummaryDto })
  @ApiBadRequestResponse({ description: "Validation failed" })
  @ApiUnauthorizedResponse({ description: "Missing or invalid access token" })
  summary(
    @CurrentUser() user: JwtPayload,
    @Query() query: SummaryQueryDto,
  ): Promise<TransactionSummaryDto> {
    return this.transactionsService.summary(user.sub, query.dateFrom, query.dateTo);
  }

  @Post()
  @ApiOperation({
    summary: "Create a transaction (returns an array when recurring generates multiple rows)",
  })
  @ApiCreatedResponse({
    schema: { oneOf: [{ $ref: "#/components/schemas/TransactionDto" }, { type: "array", items: { $ref: "#/components/schemas/TransactionDto" } }] },
  })
  @ApiBadRequestResponse({ description: "Validation failed" })
  @ApiUnauthorizedResponse({ description: "Missing or invalid access token" })
  @ApiNotFoundResponse({ description: "Category not found" })
  create(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateTransactionDto,
  ): Promise<TransactionDto | TransactionDto[]> {
    return this.transactionsService.create(user.sub, dto);
  }

  @Patch(":id")
  @ApiOperation({ summary: "Update a transaction the current user owns" })
  @ApiOkResponse({ type: TransactionDto })
  @ApiBadRequestResponse({ description: "Validation failed" })
  @ApiUnauthorizedResponse({ description: "Missing or invalid access token" })
  @ApiNotFoundResponse({ description: "Transaction or category not found" })
  update(
    @CurrentUser() user: JwtPayload,
    @Param("id") id: string,
    @Body() dto: UpdateTransactionDto,
  ): Promise<TransactionDto> {
    return this.transactionsService.update(user.sub, id, dto);
  }

  @Patch(":id/status")
  @ApiOperation({
    summary: "Change an expense's paid/pending status",
    description:
      "If the transaction was generated for a debt installment, that installment is paid (paymentDate = today) or unpaid to match, and its debt's totals/status are recomputed, atomically. The response is still just the transaction.",
  })
  @ApiOkResponse({ type: TransactionDto })
  @ApiBadRequestResponse({ description: "Validation failed, or the transaction isn't an expense" })
  @ApiUnauthorizedResponse({ description: "Missing or invalid access token" })
  @ApiNotFoundResponse({ description: "Transaction not found" })
  updateStatus(
    @CurrentUser() user: JwtPayload,
    @Param("id") id: string,
    @Body() dto: UpdateTransactionStatusDto,
  ): Promise<TransactionDto> {
    return this.transactionsService.updateStatus(user.sub, id, dto);
  }

  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: "Delete a transaction the current user owns",
    description:
      "If the transaction is linked to a debt installment, the installment is kept and its transactionId becomes null; paying it later creates a fresh linked transaction.",
  })
  @ApiNoContentResponse()
  @ApiUnauthorizedResponse({ description: "Missing or invalid access token" })
  @ApiNotFoundResponse({ description: "Transaction not found" })
  delete(@CurrentUser() user: JwtPayload, @Param("id") id: string): Promise<void> {
    return this.transactionsService.delete(user.sub, id);
  }

  @Post("bulk-delete")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: "Delete several transactions the current user owns, all-or-nothing",
    description:
      "Debt installments linked to any deleted transaction are kept with transactionId = null (same as the single delete).",
  })
  @ApiNoContentResponse()
  @ApiBadRequestResponse({
    description: "Validation failed, or one or more ids aren't owned by this user",
  })
  @ApiUnauthorizedResponse({ description: "Missing or invalid access token" })
  bulkDelete(
    @CurrentUser() user: JwtPayload,
    @Body() dto: BulkDeleteTransactionsDto,
  ): Promise<void> {
    return this.transactionsService.bulkDelete(user.sub, dto);
  }
}
