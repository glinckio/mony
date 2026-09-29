import {
  Controller,
  Headers,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  type RawBodyRequest,
} from "@nestjs/common";
import {
  ApiBadGatewayResponse,
  ApiBadRequestResponse,
  ApiExcludeController,
  ApiHeader,
  ApiOkResponse,
  ApiOperation,
  ApiServiceUnavailableResponse,
} from "@nestjs/swagger";
import type { Request } from "express";

import { SubscriptionsService } from "./subscriptions.service";

// Stripe → API. Authenticated by the Stripe-Signature header over the RAW
// body (main.ts creates the app with `rawBody: true`), not by a JWT — the
// one route outside the JSON pipeline. Hidden from the public Swagger UI.
@ApiExcludeController()
@Controller("webhooks")
export class StripeWebhookController {
  constructor(private readonly subscriptions: SubscriptionsService) {}

  @Post("stripe")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Stripe webhook (subscription status sync)" })
  @ApiHeader({ name: "stripe-signature", required: true })
  @ApiOkResponse({ description: "Received" })
  @ApiBadRequestResponse({ description: "Missing or invalid signature" })
  @ApiServiceUnavailableResponse({ description: "Payments aren't configured (development)" })
  @ApiBadGatewayResponse({ description: "Re-reading the subscription from Stripe failed" })
  async stripe(
    @Req() req: RawBodyRequest<Request>,
    @Headers("stripe-signature") signature: string | undefined,
  ): Promise<{ received: true }> {
    await this.subscriptions.handleWebhook(req.rawBody, signature);
    return { received: true };
  }
}
