import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from "@nestjs/common";
import type { Request, Response } from "express";

interface ErrorBody {
  statusCode: number;
  error: string;
  message: string[];
  path: string;
  timestamp: string;
}

// Standardized error envelope for every response the API returns.
// Kept intentionally simple (no stack traces) so it is safe to show to clients.
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const statusCode =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const message = this.extractMessage(exception, statusCode);

    const body: ErrorBody = {
      statusCode,
      error: HttpStatus[statusCode] ?? "INTERNAL_SERVER_ERROR",
      message,
      path: request.url,
      timestamp: new Date().toISOString(),
    };

    // The client only ever gets the generic message for a 500, so the real
    // cause (e.g. storage or image-processing failure) must reach the log.
    if (statusCode >= HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error(
        `${request.method} ${request.path} failed`,
        exception instanceof Error ? exception.stack : String(exception),
      );
    }
    // Picked up by the request logger so the reason shows on its line.
    response.locals.errorMessage = message.join("; ");

    response.status(statusCode).json(body);
  }

  private extractMessage(exception: unknown, statusCode: number): string[] {
    if (exception instanceof HttpException) {
      const response = exception.getResponse();
      if (typeof response === "string") return [response];
      if (typeof response === "object" && response !== null && "message" in response) {
        const rawMessage = (response as { message: unknown }).message;
        return Array.isArray(rawMessage) ? rawMessage.map(String) : [String(rawMessage)];
      }
    }
    if (statusCode === HttpStatus.INTERNAL_SERVER_ERROR) {
      return ["Unexpected error. Please try again later."];
    }
    return ["Unexpected error."];
  }
}
