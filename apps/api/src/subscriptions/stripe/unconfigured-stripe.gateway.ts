import type { PlanType } from "@mony/shared-types";
import { ServiceUnavailableException } from "@nestjs/common";

import { StripeGateway } from "./stripe-gateway";

// Development without Stripe keys: everything answers 503 (never used in
// production, where missing keys are a startup error — see StripeModule).
export class UnconfiguredStripeGateway extends StripeGateway {
  priceId(_plan: PlanType): string {
    throw this.unavailable();
  }

  planOfPrice(): PlanType | null {
    return null;
  }

  retrievePrice(): Promise<never> {
    return Promise.reject(this.unavailable());
  }

  createCustomer(): Promise<never> {
    return Promise.reject(this.unavailable());
  }

  createCheckoutSession(): Promise<never> {
    return Promise.reject(this.unavailable());
  }

  retrieveSubscription(): Promise<never> {
    return Promise.reject(this.unavailable());
  }

  listSubscriptions(): Promise<never> {
    return Promise.reject(this.unavailable());
  }

  scheduleCancel(): Promise<never> {
    return Promise.reject(this.unavailable());
  }

  undoScheduledCancel(): Promise<never> {
    return Promise.reject(this.unavailable());
  }

  createPortalSession(): Promise<never> {
    return Promise.reject(this.unavailable());
  }

  parseWebhook(): never {
    throw this.unavailable();
  }

  private unavailable(): ServiceUnavailableException {
    return new ServiceUnavailableException("Payments aren't configured.");
  }
}
