import {
  PLAN_TYPES,
  SUBSCRIPTION_STATUSES,
  type PlanType,
  type SubscriptionStatus,
} from "@mony/shared-types";
import { ApiProperty } from "@nestjs/swagger";
import { IsIn } from "class-validator";

export class PlanDto {
  @ApiProperty({ example: "ANNUAL", enum: PLAN_TYPES })
  plan!: PlanType;

  @ApiProperty({ example: "65.34", description: "Decimal string, as configured in Stripe." })
  amount!: string;

  @ApiProperty({ example: "BRL" })
  currency!: string;

  @ApiProperty({ example: "year", enum: ["month", "year"] })
  interval!: "month" | "year";

  @ApiProperty({ example: 7, description: "Free trial, first subscription only." })
  trialDays!: number;
}

export class SubscriptionDto {
  @ApiProperty({ example: "MONTHLY", enum: PLAN_TYPES })
  plan!: PlanType;

  @ApiProperty({
    example: "TRIALING",
    enum: SUBSCRIPTION_STATUSES,
    description: "Mirrored from Stripe. PAST_DUE = payment pending (fix it in the portal).",
  })
  status!: SubscriptionStatus;

  @ApiProperty({
    type: String,
    example: "2026-10-05T12:00:00.000Z",
    nullable: true,
    description: "Renews at this instant — or ends, when cancelScheduled.",
  })
  currentPeriodEnd!: string | null;

  @ApiProperty({
    type: String,
    example: "2026-10-05T12:00:00.000Z",
    nullable: true,
    description: "End of the free trial (kept after it ends); null when there was none.",
  })
  trialEndsAt!: string | null;

  @ApiProperty({
    example: false,
    description: "Set to end at currentPeriodEnd (from the app, the Customer Portal or Stripe).",
  })
  cancelScheduled!: boolean;

  @ApiProperty({
    example: "2026-09-28T12:00:00.000Z",
    description: "Last time the local copy changed (synced from Stripe).",
  })
  updatedAt!: string;
}

export class MySubscriptionDto {
  @ApiProperty({
    type: SubscriptionDto,
    nullable: true,
    description: "null when the user never subscribed.",
  })
  subscription!: SubscriptionDto | null;
}

export class CheckoutDto {
  @ApiProperty({ example: "ANNUAL", enum: PLAN_TYPES })
  @IsIn(PLAN_TYPES)
  plan!: PlanType;
}

export class RedirectUrlDto {
  @ApiProperty({
    example:
      "https://checkout.stripe.com/c/pay/cs_test_a12BbdigC9LA0yEEIS8LUCljG38rDcRMtx6MipOZzYNYeHqOeDTOkECCpw",
    description:
      "Short-lived Stripe-hosted page (Checkout or Customer Portal) to open in an in-app browser.",
  })
  url!: string;
}
