import { PLAN_TYPES, TRIAL_DAYS, isLiveSubscription, type PlanType } from "@mony/shared-types";
import {
  BadGatewayException,
  BadRequestException,
  ConflictException,
  HttpException,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { Subscription } from "@prisma/client";

import { PrismaService } from "../prisma/prisma.service";

import { PlanDto, SubscriptionDto } from "./dto/subscription.dto";
import { StripeGateway, type StripeSubscriptionSnapshot } from "./stripe/stripe-gateway";
import { fieldsFromSnapshot, mapStripeStatus, shouldApply } from "./subscription-sync";

const PLANS_CACHE_MS = 60 * 60 * 1000;
const PLANS_FAILURE_CACHE_MS = 30 * 1000;

export type ReturnResult = "success" | "canceled" | "portal";

// Subscriptions through Stripe Checkout (docs/specs/subscriptions). The
// local row mirrors Stripe: every change is re-read from Stripe and
// applied through syncFromStripe, so webhooks may arrive late, twice or
// out of order. Status never gates any other feature (product.md).
@Injectable()
export class SubscriptionsService {
  private readonly logger = new Logger(SubscriptionsService.name);
  private plansCache: { at: number; plans: PlanDto[] } | null = null;
  private plansInFlight: Promise<PlanDto[]> | null = null;
  private plansFailedAt: number | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly stripe: StripeGateway,
    private readonly config: ConfigService,
  ) {}

  // Public and read on every visit to the screen: one Stripe round trip
  // per hour, shared by concurrent callers; while Stripe is down, the last
  // good answer is served (and a failure is remembered for 30 s) instead
  // of sending every request to Stripe.
  async plans(): Promise<PlanDto[]> {
    const now = Date.now();
    if (this.plansCache && now - this.plansCache.at < PLANS_CACHE_MS) {
      return this.plansCache.plans;
    }
    if (this.plansFailedAt && now - this.plansFailedAt < PLANS_FAILURE_CACHE_MS) {
      if (this.plansCache) return this.plansCache.plans;
      throw new BadGatewayException("Payment provider error.");
    }
    this.plansInFlight ??= this.fetchPlans().finally(() => {
      this.plansInFlight = null;
    });
    try {
      return await this.plansInFlight;
    } catch (error) {
      this.plansFailedAt = Date.now();
      if (this.plansCache) return this.plansCache.plans;
      throw error;
    }
  }

  private async fetchPlans(): Promise<PlanDto[]> {
    const plans = await this.callStripe(() =>
      Promise.all(
        PLAN_TYPES.map(async (plan) => {
          const price = await this.stripe.retrievePrice(this.stripe.priceId(plan));
          return {
            plan,
            amount: (price.unitAmount / 100).toFixed(2),
            currency: price.currency.toUpperCase(),
            interval: price.interval,
            trialDays: TRIAL_DAYS,
          };
        }),
      ),
    );
    this.plansCache = { at: Date.now(), plans };
    this.plansFailedAt = null;
    return plans;
  }

  async me(userId: string): Promise<SubscriptionDto | null> {
    const subscription = await this.prisma.subscription.findUnique({ where: { userId } });
    return subscription ? this.toDto(subscription) : null;
  }

  async checkout(userId: string, plan: PlanType): Promise<string> {
    const existing = await this.prisma.subscription.findUnique({ where: { userId } });
    if (existing && isLiveSubscription(existing.status)) {
      throw new ConflictException("You already have a subscription.");
    }
    const customerId = await this.ensureCustomer(userId);
    // The local row only appears once the webhook lands: Stripe decides
    // whether the user is already subscribed (a checkout finished moments
    // ago, or on another device) and whether they ever had the trial.
    const onStripe = await this.callStripe(() => this.stripe.listSubscriptions(customerId));
    const live = onStripe.find((subscription) =>
      isLiveSubscription(mapStripeStatus(subscription.status)),
    );
    if (live) {
      // Catch up with the webhook so the app can show it right away.
      await this.syncFromStripe(live);
      throw new ConflictException("You already have a subscription.");
    }
    return this.callStripe(() =>
      this.stripe.createCheckoutSession({
        customerId,
        priceId: this.stripe.priceId(plan),
        userId,
        // Legacy's 7-day trial, once per user.
        trialDays: existing || onStripe.length > 0 ? null : TRIAL_DAYS,
        successUrl: this.returnUrl("success"),
        cancelUrl: this.returnUrl("canceled"),
      }),
    );
  }

  async cancel(userId: string): Promise<SubscriptionDto> {
    const subscription = await this.prisma.subscription.findUnique({ where: { userId } });
    if (!subscription || !isLiveSubscription(subscription.status)) {
      throw new NotFoundException("No active subscription.");
    }
    // At the period end, never immediately (legacy "cancelamento agendado").
    return this.changeOnStripe(subscription, (id) => this.stripe.scheduleCancel(id));
  }

  async reactivate(userId: string): Promise<SubscriptionDto> {
    const subscription = await this.prisma.subscription.findUnique({ where: { userId } });
    if (!subscription || subscription.status === "CANCELED" || !subscription.cancelScheduled) {
      throw new NotFoundException("No subscription scheduled to cancel.");
    }
    return this.changeOnStripe(subscription, (id) => this.stripe.undoScheduledCancel(id));
  }

  // Applies a change on Stripe and mirrors the result. When Stripe refuses
  // it, the local row may be stale (e.g. Stripe already ended the
  // subscription and the webhook got lost): re-sync it before failing, so
  // the next read is right.
  private async changeOnStripe(
    subscription: Subscription,
    change: (stripeSubscriptionId: string) => Promise<StripeSubscriptionSnapshot>,
  ): Promise<SubscriptionDto> {
    const id = subscription.stripeSubscriptionId;
    let snapshot: StripeSubscriptionSnapshot;
    try {
      snapshot = await this.callStripe(() => change(id));
    } catch (error) {
      try {
        await this.syncFromStripe(
          await this.callStripe(() => this.stripe.retrieveSubscription(id)),
        );
      } catch {
        // Already logged by callStripe; the original failure is what counts.
      }
      throw error;
    }
    return this.toDto((await this.syncFromStripe(snapshot)) ?? subscription);
  }

  async portal(userId: string): Promise<string> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { stripeCustomerId: true },
    });
    if (!user?.stripeCustomerId) {
      throw new NotFoundException("No billing account yet.");
    }
    const customerId = user.stripeCustomerId;
    return this.callStripe(() =>
      this.stripe.createPortalSession(customerId, this.returnUrl("portal")),
    );
  }

  // Verified Stripe event → re-read its subscription → mirror it. The
  // re-read happens outside the lock (no network call inside a DB
  // transaction): a slow handler may write a slightly older snapshot of the
  // same subscription, which the next event for it corrects.
  async handleWebhook(rawBody: Buffer | undefined, signature: string | undefined): Promise<void> {
    if (!rawBody || !signature) {
      throw new BadRequestException("Missing Stripe signature or body.");
    }
    let event;
    try {
      event = this.stripe.parseWebhook(rawBody, signature);
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.warn(`Rejected a Stripe webhook: ${String(error)}`);
      throw new BadRequestException("Invalid Stripe signature.");
    }
    if (!event.subscriptionId) return;
    const subscriptionId = event.subscriptionId;
    const snapshot = await this.callStripe(() => this.stripe.retrieveSubscription(subscriptionId));
    await this.syncFromStripe(snapshot);
  }

  // Upserts the owner's row from a Stripe subscription, unless it's an
  // older one than what we have. Returns the resulting row (null when the
  // subscription can't be attributed to a user or plan).
  async syncFromStripe(snapshot: StripeSubscriptionSnapshot): Promise<Subscription | null> {
    const userId = await this.ownerOf(snapshot);
    const plan = this.stripe.planOfPrice(snapshot.priceId);
    if (!userId || !plan) {
      this.logger.warn(
        `Ignoring Stripe subscription ${snapshot.id}: ${userId ? "unknown price" : "unknown customer"}.`,
      );
      return null;
    }
    const fields = fieldsFromSnapshot(snapshot, plan);
    return this.prisma.$transaction(async (tx) => {
      // Per-user advisory lock, not a row lock: on the FIRST subscription
      // there's no row to lock yet, and that's exactly when Stripe sends
      // several events at once. Released at commit.
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${userId}))`;
      const current = await tx.subscription.findUnique({
        where: { userId },
        select: { stripeSubscriptionId: true, stripeCreatedAt: true, status: true },
      });
      if (!shouldApply(current, fields)) {
        return tx.subscription.findUnique({ where: { userId } });
      }
      return tx.subscription.upsert({
        where: { userId },
        create: { userId, ...fields },
        update: fields,
      });
    });
  }

  private async ownerOf(snapshot: StripeSubscriptionSnapshot): Promise<string | null> {
    if (snapshot.metadataUserId) {
      const user = await this.prisma.user.findUnique({
        where: { id: snapshot.metadataUserId },
        select: { id: true, stripeCustomerId: true },
      });
      // Metadata must agree with the customer the subscription belongs to
      // (a user without a customer never had a checkout, so can't own one).
      if (user && user.stripeCustomerId === snapshot.customerId) return user.id;
    }
    const user = await this.prisma.user.findUnique({
      where: { stripeCustomerId: snapshot.customerId },
      select: { id: true },
    });
    return user?.id ?? null;
  }

  // The user's Stripe customer, created once. The gateway's idempotency
  // key makes two parallel first checkouts get the same customer from
  // Stripe; the conditional update keeps the stored one if they don't.
  // Only the email is sent (Stripe's receipts); the card holder's name is
  // collected by Checkout itself.
  private async ensureCustomer(userId: string): Promise<string> {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { email: true, stripeCustomerId: true },
    });
    if (user.stripeCustomerId) return user.stripeCustomerId;
    const customerId = await this.callStripe(() =>
      this.stripe.createCustomer({ email: user.email, userId }),
    );
    const { count } = await this.prisma.user.updateMany({
      where: { id: userId, stripeCustomerId: null },
      data: { stripeCustomerId: customerId },
    });
    if (count === 1) return customerId;
    const winner = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { stripeCustomerId: true },
    });
    this.logger.warn(`Unused Stripe customer ${customerId} left by a parallel checkout.`);
    return winner.stripeCustomerId!;
  }

  // API_PUBLIC_URL is required (https) in production by StripeModule.
  private returnUrl(result: ReturnResult): string {
    const base = (this.config.get<string>("API_PUBLIC_URL") ?? "http://localhost:3000").replace(
      /\/+$/,
      "",
    );
    return `${base}/subscriptions/return?result=${result}`;
  }

  // Stripe failures surface as 502 with a generic message; our own HTTP
  // errors (e.g. 503 when not configured) pass through. Only the error's
  // identifiers are logged: Stripe's messages can echo the input (e.g.
  // "Invalid email address: …").
  private async callStripe<T>(call: () => Promise<T>): Promise<T> {
    try {
      return await call();
    } catch (error) {
      if (error instanceof HttpException) throw error;
      const { type, code, statusCode, requestId } = error as {
        type?: string;
        code?: string;
        statusCode?: number;
        requestId?: string;
      };
      const details = Object.entries({ type, code, status: statusCode, request: requestId })
        .filter(([, value]) => value !== undefined)
        .map(([key, value]) => `${key}=${String(value)}`)
        .join(" ");
      this.logger.error(`Stripe call failed${details ? ` (${details})` : ""}.`);
      throw new BadGatewayException("Payment provider error.");
    }
  }

  private toDto(subscription: Subscription): SubscriptionDto {
    return {
      plan: subscription.plan,
      status: subscription.status,
      currentPeriodEnd: subscription.currentPeriodEnd?.toISOString() ?? null,
      trialEndsAt: subscription.trialEndsAt?.toISOString() ?? null,
      cancelScheduled: subscription.cancelScheduled,
      updatedAt: subscription.updatedAt.toISOString(),
    };
  }
}
