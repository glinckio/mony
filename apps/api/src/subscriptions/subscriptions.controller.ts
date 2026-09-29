import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Query,
  Redirect,
  UseGuards,
} from "@nestjs/common";
import {
  ApiBadGatewayResponse,
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiExtraModels,
  ApiFoundResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiServiceUnavailableResponse,
  ApiTags,
  ApiUnauthorizedResponse,
  getSchemaPath,
} from "@nestjs/swagger";

import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import type { JwtPayload } from "../auth/interfaces/jwt-payload.interface";

import {
  CheckoutDto,
  MySubscriptionDto,
  PlanDto,
  RedirectUrlDto,
  SubscriptionDto,
} from "./dto/subscription.dto";
import { SubscriptionsService, type ReturnResult } from "./subscriptions.service";

const RETURN_RESULTS: ReturnResult[] = ["success", "canceled", "portal"];
// Where the in-app browser hands control back to the app
// (WebBrowser.openAuthSessionAsync closes on this scheme).
const APP_RETURN_URL = "mony://subscription";

@ApiTags("subscriptions")
@Controller("subscriptions")
export class SubscriptionsController {
  constructor(private readonly subscriptions: SubscriptionsService) {}

  @Get("plans")
  @ApiOperation({
    summary: "The two plans (monthly, annual) with their Stripe price",
    description:
      "Public. Prices come from Stripe (cached for an hour); while Stripe fails, the last good list is served.",
  })
  @ApiOkResponse({ type: [PlanDto], description: "MONTHLY first, then ANNUAL" })
  @ApiServiceUnavailableResponse({ description: "Payments aren't configured (development)" })
  @ApiBadGatewayResponse({
    description:
      "Stripe failed or didn't answer, and there's no earlier price list to fall back on",
  })
  plans(): Promise<PlanDto[]> {
    return this.subscriptions.plans();
  }

  @Get("me")
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: "The current user's subscription ({ subscription: null } if none)",
    description:
      "Mirrored from Stripe webhooks. Never gates any feature (docs/steering/product.md).",
  })
  @ApiOkResponse({ type: MySubscriptionDto })
  @ApiUnauthorizedResponse({ description: "Missing or invalid access token" })
  async me(@CurrentUser() user: JwtPayload): Promise<MySubscriptionDto> {
    return { subscription: await this.subscriptions.me(user.sub) };
  }

  @Post("checkout")
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: "Start a Stripe Checkout for a plan",
    description:
      "Returns the Stripe-hosted page to open in an in-app browser. 7-day free trial on the user's first subscription. The subscription itself appears once Stripe's webhook arrives.",
  })
  @ApiOkResponse({ type: RedirectUrlDto })
  @ApiBadRequestResponse({ description: "Validation failed (plan must be MONTHLY or ANNUAL)" })
  @ApiUnauthorizedResponse({ description: "Missing or invalid access token" })
  @ApiConflictResponse({
    description:
      "The user already has a trialing, active or pending subscription (checked on Stripe too, so one whose webhook hasn't arrived yet counts; it's synced before answering)",
  })
  @ApiServiceUnavailableResponse({ description: "Payments aren't configured (development)" })
  @ApiBadGatewayResponse({ description: "Stripe returned an error or didn't answer" })
  async checkout(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CheckoutDto,
  ): Promise<RedirectUrlDto> {
    return { url: await this.subscriptions.checkout(user.sub, dto.plan) };
  }

  @Post("cancel")
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: "Cancel at the end of the current period (never immediately)",
    description:
      "Answers the updated subscription with cancelScheduled: true; status is unchanged and access lasts until currentPeriodEnd.",
  })
  @ApiOkResponse({ type: SubscriptionDto })
  @ApiUnauthorizedResponse({ description: "Missing or invalid access token" })
  @ApiNotFoundResponse({ description: "No trialing, active or pending subscription" })
  @ApiServiceUnavailableResponse({ description: "Payments aren't configured (development)" })
  @ApiBadGatewayResponse({
    description:
      "Stripe refused the change or didn't answer. The subscription is re-read from Stripe first, so a following GET /subscriptions/me is current.",
  })
  cancel(@CurrentUser() user: JwtPayload): Promise<SubscriptionDto> {
    return this.subscriptions.cancel(user.sub);
  }

  @Post("reactivate")
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: "Undo a scheduled cancellation",
    description:
      "Clears a cancellation scheduled from the app, the Customer Portal or the Stripe Dashboard. Answers the updated subscription with cancelScheduled: false.",
  })
  @ApiOkResponse({ type: SubscriptionDto })
  @ApiUnauthorizedResponse({ description: "Missing or invalid access token" })
  @ApiNotFoundResponse({ description: "No subscription scheduled to cancel" })
  @ApiServiceUnavailableResponse({ description: "Payments aren't configured (development)" })
  @ApiBadGatewayResponse({
    description:
      "Stripe refused the change or didn't answer. The subscription is re-read from Stripe first, so a following GET /subscriptions/me is current.",
  })
  reactivate(@CurrentUser() user: JwtPayload): Promise<SubscriptionDto> {
    return this.subscriptions.reactivate(user.sub);
  }

  @Post("portal")
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: "Open the Stripe Customer Portal",
    description: "Update the card (fixes a pending payment) and see invoices.",
  })
  // An explicit content block: `example` next to `type` would also leave a
  // stray `example` key on the response object (invalid OpenAPI 3.0).
  @ApiExtraModels(RedirectUrlDto)
  @ApiOkResponse({
    content: {
      "application/json": {
        schema: { $ref: getSchemaPath(RedirectUrlDto) },
        example: {
          url: "https://billing.stripe.com/p/session/test_zbwqyufigUdLb3WDHIJza1sI8c2U0a5BEmPo2w2dZfwDa6OeBNvqFHqVyPkmz41i",
        },
      },
    },
  })
  @ApiUnauthorizedResponse({ description: "Missing or invalid access token" })
  @ApiNotFoundResponse({ description: "The user never started a checkout" })
  @ApiServiceUnavailableResponse({ description: "Payments aren't configured (development)" })
  @ApiBadGatewayResponse({ description: "Stripe returned an error or didn't answer" })
  async portal(@CurrentUser() user: JwtPayload): Promise<RedirectUrlDto> {
    return { url: await this.subscriptions.portal(user.sub) };
  }

  @Get("return")
  @Redirect(APP_RETURN_URL, HttpStatus.FOUND)
  @ApiOperation({
    summary: "Stripe's success/cancel/return URL: bounces back into the app",
    description:
      "Stripe only redirects to http(s) URLs; this answers 302 to mony://subscription?result=…, which closes the app's in-app browser. Carries no data.",
  })
  @ApiQuery({
    name: "result",
    enum: RETURN_RESULTS,
    required: false,
    description: "Missing or any other value is passed on as canceled.",
  })
  @ApiFoundResponse({
    description: "Redirect to mony://subscription?result=…",
    headers: {
      Location: {
        description: "The app's deep link; result is always one of success, canceled, portal.",
        schema: { type: "string", example: "mony://subscription?result=success" },
      },
    },
  })
  returnToApp(@Query("result") result?: string): { url: string } {
    const safe = RETURN_RESULTS.includes(result as ReturnResult) ? result : "canceled";
    return { url: `${APP_RETURN_URL}?result=${safe}` };
  }
}
