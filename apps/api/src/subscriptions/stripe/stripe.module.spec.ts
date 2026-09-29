import { Logger, ServiceUnavailableException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Test } from "@nestjs/testing";

import { FakeStripeGateway } from "./fake-stripe.gateway";
import { StripeGateway } from "./stripe-gateway";
import { StripeSdkGateway } from "./stripe-sdk.gateway";
import { StripeModule } from "./stripe.module";
import { UnconfiguredStripeGateway } from "./unconfigured-stripe.gateway";

// The real StripeModule factory, resolved through Nest's DI with a stubbed
// ConfigService. Building StripeSdkGateway only instantiates the SDK
// client; nothing here calls Stripe.
const CONFIGURED: Record<string, string | undefined> = {
  STRIPE_SECRET_KEY: "sk_live_mony_unit",
  STRIPE_WEBHOOK_SECRET: "whsec_mony_unit",
  STRIPE_PRICE_MONTHLY: "price_mony_monthly",
  STRIPE_PRICE_ANNUAL: "price_mony_annual",
  API_PUBLIC_URL: "https://api.mony.example",
};

async function gatewayFor(
  nodeEnv: string,
  values: Record<string, string | undefined>,
): Promise<StripeGateway> {
  process.env.NODE_ENV = nodeEnv;
  const moduleRef = await Test.createTestingModule({ imports: [StripeModule] })
    .overrideProvider(ConfigService)
    .useValue({ get: (key: string) => values[key] })
    .compile();
  return moduleRef.get(StripeGateway);
}

describe("StripeModule", () => {
  const originalNodeEnv = process.env.NODE_ENV;
  let warn: jest.SpyInstance;

  beforeEach(() => {
    warn = jest.spyOn(Logger.prototype, "warn").mockImplementation(() => undefined);
  });

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv;
    jest.restoreAllMocks();
  });

  describe("under NODE_ENV=test", () => {
    it("provides the in-memory fake, whatever the config", async () => {
      expect(await gatewayFor("test", CONFIGURED)).toBeInstanceOf(FakeStripeGateway);
      expect(await gatewayFor("test", {})).toBeInstanceOf(FakeStripeGateway);
    });
  });

  describe("under NODE_ENV=production", () => {
    it("refuses to start without the Stripe keys, naming the missing ones", async () => {
      await expect(
        gatewayFor("production", {
          ...CONFIGURED,
          STRIPE_WEBHOOK_SECRET: undefined,
          // An empty value counts as missing.
          STRIPE_PRICE_ANNUAL: "",
        }),
      ).rejects.toThrow("STRIPE_WEBHOOK_SECRET, STRIPE_PRICE_ANNUAL must be set in production.");
      await expect(gatewayFor("production", {})).rejects.toThrow(
        "STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, STRIPE_PRICE_MONTHLY, STRIPE_PRICE_ANNUAL must be set in production.",
      );
    });

    it("refuses to start unless API_PUBLIC_URL is set and https", async () => {
      const message = "API_PUBLIC_URL must be set and use https:// in production.";
      await expect(
        gatewayFor("production", { ...CONFIGURED, API_PUBLIC_URL: undefined }),
      ).rejects.toThrow(message);
      await expect(
        gatewayFor("production", { ...CONFIGURED, API_PUBLIC_URL: "http://api.mony.example" }),
      ).rejects.toThrow(message);
    });

    it("uses the real SDK with the configured prices, without warnings", async () => {
      const gateway = await gatewayFor("production", CONFIGURED);

      expect(gateway).toBeInstanceOf(StripeSdkGateway);
      expect(gateway.priceId("MONTHLY")).toBe("price_mony_monthly");
      expect(gateway.priceId("ANNUAL")).toBe("price_mony_annual");
      expect(gateway.planOfPrice("price_mony_annual")).toBe("ANNUAL");
      expect(gateway.planOfPrice("price_someone_else")).toBeNull();
      expect(warn).not.toHaveBeenCalled();
    });

    it("warns, but starts, with a Stripe test key", async () => {
      const gateway = await gatewayFor("production", {
        ...CONFIGURED,
        STRIPE_SECRET_KEY: "sk_test_mony_unit",
      });

      expect(gateway).toBeInstanceOf(StripeSdkGateway);
      expect(warn).toHaveBeenCalledWith("Using a Stripe TEST key in production.");
    });
  });

  describe("under NODE_ENV=development", () => {
    it("answers 503 without the keys, and says which are missing", async () => {
      const gateway = await gatewayFor("development", {
        ...CONFIGURED,
        STRIPE_SECRET_KEY: undefined,
      });

      expect(gateway).toBeInstanceOf(UnconfiguredStripeGateway);
      expect(warn).toHaveBeenCalledWith(expect.stringContaining("STRIPE_SECRET_KEY"));
      await expect(gateway.retrievePrice("price_mony_monthly")).rejects.toBeInstanceOf(
        ServiceUnavailableException,
      );
    });

    it("uses the real SDK with an http API_PUBLIC_URL (a LAN IP)", async () => {
      const gateway = await gatewayFor("development", {
        ...CONFIGURED,
        STRIPE_SECRET_KEY: "sk_test_mony_unit",
        API_PUBLIC_URL: "http://192.168.0.10:3000",
      });

      expect(gateway).toBeInstanceOf(StripeSdkGateway);
      expect(warn).not.toHaveBeenCalled();
    });
  });
});
