import { INestApplication, ValidationPipe } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import request from "supertest";

import { AppModule } from "../src/app.module";
import { AllExceptionsFilter } from "../src/common/filters/all-exceptions.filter";
import { PrismaService } from "../src/prisma/prisma.service";
import { FakeStripeGateway } from "../src/subscriptions/stripe/fake-stripe.gateway";
import { StripeGateway } from "../src/subscriptions/stripe/stripe-gateway";

// NODE_ENV=test → StripeModule provides the in-memory FakeStripeGateway.
// Webhooks still go through Stripe's real signature verification, signed
// with the fake's test secret.
describe("Subscriptions (e2e)", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let stripe: FakeStripeGateway;
  let tokenA: string;
  let tokenB: string;
  let tokenC: string;
  let tokenD: string;
  const stamp = Date.now();
  const emailA = `e2e-subs-a-${stamp}@example.com`;
  const emailB = `e2e-subs-b-${stamp}@example.com`;
  const emailC = `e2e-subs-c-${stamp}@example.com`;
  const emailD = `e2e-subs-d-${stamp}@example.com`;
  const password = "correcthorsebattery";

  const http = () => request(app.getHttpServer());
  const as = (token: string) => ({ Authorization: `Bearer ${token}` });
  const register = async (email: string): Promise<string> =>
    (
      await http()
        .post("/auth/register")
        .send({ name: "E2E Tester", email, password, passwordConfirmation: password })
    ).body.accessToken;
  const sendWebhook = (type: string, object: Record<string, unknown>) => {
    const { body, signature } = stripe.sign({ type, object });
    return http()
      .post("/webhooks/stripe")
      .set("Content-Type", "application/json")
      .set("stripe-signature", signature)
      .send(body);
  };
  const me = async (token: string) =>
    (await http().get("/subscriptions/me").set(as(token)).expect(200)).body.subscription;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    // Same options as main.ts: the webhook needs the raw body.
    app = moduleFixture.createNestApplication({ rawBody: true });
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: { enableImplicitConversion: true },
      }),
    );
    app.useGlobalFilters(new AllExceptionsFilter());
    await app.init();

    prisma = app.get(PrismaService);
    stripe = app.get(StripeGateway);
    expect(stripe).toBeInstanceOf(FakeStripeGateway);
    tokenA = await register(emailA);
    tokenB = await register(emailB);
    tokenC = await register(emailC);
    tokenD = await register(emailD);
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { email: { in: [emailA, emailB, emailC, emailD] } } });
    await app.close();
  });

  it("lists the two plans publicly, with legacy prices and trial", async () => {
    const response = await http().get("/subscriptions/plans").expect(200);
    expect(response.body).toEqual([
      { plan: "MONTHLY", amount: "9.90", currency: "BRL", interval: "month", trialDays: 7 },
      { plan: "ANNUAL", amount: "65.34", currency: "BRL", interval: "year", trialDays: 7 },
    ]);
  });

  it("requires a login for everything but the plans, the return URL and the webhook", async () => {
    await http().get("/subscriptions/me").expect(401);
    await http().post("/subscriptions/checkout").send({ plan: "MONTHLY" }).expect(401);
    await http().post("/subscriptions/cancel").expect(401);
    await http().post("/subscriptions/reactivate").expect(401);
    await http().post("/subscriptions/portal").expect(401);
  });

  it("bounces Stripe's return URL back into the app, sanitizing the result", async () => {
    const ok = await http().get("/subscriptions/return?result=success").expect(302);
    expect(ok.headers.location).toBe("mony://subscription?result=success");
    const junk = await http().get("/subscriptions/return?result=javascript:alert(1)").expect(302);
    expect(junk.headers.location).toBe("mony://subscription?result=canceled");
  });

  it("rejects webhooks without a valid signature", async () => {
    await http()
      .post("/webhooks/stripe")
      .set("Content-Type", "application/json")
      .send({ type: "customer.subscription.updated" })
      .expect(400);
    const { body } = stripe.sign({
      type: "customer.subscription.updated",
      object: { id: "sub_x" },
    });
    await http()
      .post("/webhooks/stripe")
      .set("Content-Type", "application/json")
      .set("stripe-signature", "t=1,v1=deadbeef")
      .send(body)
      .expect(400);
  });

  describe("lifecycle", () => {
    let checkoutUrl: string;
    let subscriptionId: string;

    it("has no subscription at first; the portal needs a checkout first", async () => {
      expect(await me(tokenA)).toBeNull();
      await http().post("/subscriptions/portal").set(as(tokenA)).expect(404);
      await http().post("/subscriptions/cancel").set(as(tokenA)).expect(404);
    });

    it("starts a checkout: creates the Stripe customer once, with the 7-day trial", async () => {
      await http()
        .post("/subscriptions/checkout")
        .set(as(tokenA))
        .send({ plan: "YEARLY" })
        .expect(400);
      const response = await http()
        .post("/subscriptions/checkout")
        .set(as(tokenA))
        .send({ plan: "MONTHLY" })
        .expect(200);
      checkoutUrl = response.body.url;
      expect(checkoutUrl).toMatch(/^https:\/\/checkout\.stripe\.test\//);

      const session = [...stripe.sessions.values()].at(-1)!;
      expect(session).toMatchObject({
        priceId: "price_test_monthly",
        trialDays: 7,
        successUrl: expect.stringMatching(/\/subscriptions\/return\?result=success$/),
        cancelUrl: expect.stringMatching(/\/subscriptions\/return\?result=canceled$/),
      });
      const user = await prisma.user.findUniqueOrThrow({ where: { email: emailA } });
      expect(user.stripeCustomerId).toBe(session.customerId);
      // Only what Stripe needs: the email (receipts) and our id (deletion).
      expect(stripe.customers.get(session.customerId)).toEqual({ email: emailA, userId: user.id });

      // Abandoning and starting again reuses the same customer.
      await http()
        .post("/subscriptions/checkout")
        .set(as(tokenA))
        .send({ plan: "ANNUAL" })
        .expect(200);
      expect([...stripe.sessions.values()].at(-1)!.customerId).toBe(session.customerId);
      expect(stripe.customers.size).toBe(1);
    });

    it("mirrors the subscription once Stripe's webhook arrives (trialing)", async () => {
      const subscription = stripe.completeCheckout(checkoutUrl);
      subscriptionId = subscription.id;
      await sendWebhook("checkout.session.completed", {
        object: "checkout.session",
        mode: "subscription",
        subscription: subscriptionId,
      }).expect(200);

      const current = await me(tokenA);
      expect(current).toMatchObject({
        plan: "MONTHLY",
        status: "TRIALING",
        cancelScheduled: false,
        trialEndsAt: new Date(subscription.trialEnd! * 1000).toISOString(),
      });
      expect(JSON.stringify(current)).not.toMatch(/sub_|cus_/);
    });

    it("processes a repeated event idempotently", async () => {
      await sendWebhook("customer.subscription.updated", { id: subscriptionId }).expect(200);
      await sendWebhook("customer.subscription.updated", { id: subscriptionId }).expect(200);
      expect(await prisma.subscription.count({ where: { user: { email: emailA } } })).toBe(1);
    });

    it("refuses a second checkout while subscribed (409)", async () => {
      await http()
        .post("/subscriptions/checkout")
        .set(as(tokenA))
        .send({ plan: "ANNUAL" })
        .expect(409);
    });

    it("tracks a failed payment as pending, and the portal fixes it", async () => {
      stripe.subscriptions.set(subscriptionId, {
        ...stripe.subscriptions.get(subscriptionId)!,
        status: "past_due",
      });
      await sendWebhook("invoice.payment_failed", {
        parent: { subscription_details: { subscription: subscriptionId } },
      }).expect(200);
      expect((await me(tokenA)).status).toBe("PAST_DUE");

      const portal = await http().post("/subscriptions/portal").set(as(tokenA)).expect(200);
      expect(portal.body.url).toMatch(/^https:\/\/billing\.stripe\.test\//);
      expect(stripe.portalSessions.at(-1)!.returnUrl).toMatch(/result=portal$/);

      stripe.subscriptions.set(subscriptionId, {
        ...stripe.subscriptions.get(subscriptionId)!,
        status: "active",
      });
      await sendWebhook("invoice.paid", {
        parent: { subscription_details: { subscription: subscriptionId } },
      }).expect(200);
      expect((await me(tokenA)).status).toBe("ACTIVE");
    });

    it("cancels at the period end and reactivates", async () => {
      await http().post("/subscriptions/reactivate").set(as(tokenA)).expect(404);
      const canceled = await http().post("/subscriptions/cancel").set(as(tokenA)).expect(200);
      expect(canceled.body).toMatchObject({ status: "ACTIVE", cancelScheduled: true });
      expect(stripe.subscriptions.get(subscriptionId)!.cancelAtPeriodEnd).toBe(true);

      const reactivated = await http()
        .post("/subscriptions/reactivate")
        .set(as(tokenA))
        .expect(200);
      expect(reactivated.body).toMatchObject({ status: "ACTIVE", cancelScheduled: false });

      // Scheduled at a date instead (Dashboard / Customer Portal): undone too.
      stripe.subscriptions.set(subscriptionId, {
        ...stripe.subscriptions.get(subscriptionId)!,
        cancelAt: Math.floor(Date.now() / 1000) + 86_400,
      });
      await sendWebhook("customer.subscription.updated", { id: subscriptionId }).expect(200);
      expect((await me(tokenA)).cancelScheduled).toBe(true);
      await http().post("/subscriptions/reactivate").set(as(tokenA)).expect(200);
      expect(stripe.subscriptions.get(subscriptionId)!.cancelAt).toBeNull();
      expect((await me(tokenA)).cancelScheduled).toBe(false);
    });

    it("ends it when Stripe deletes it; a new checkout then has no trial", async () => {
      stripe.subscriptions.set(subscriptionId, {
        ...stripe.subscriptions.get(subscriptionId)!,
        status: "canceled",
      });
      await sendWebhook("customer.subscription.deleted", { id: subscriptionId }).expect(200);
      expect((await me(tokenA)).status).toBe("CANCELED");

      const response = await http()
        .post("/subscriptions/checkout")
        .set(as(tokenA))
        .send({ plan: "ANNUAL" })
        .expect(200);
      expect([...stripe.sessions.values()].at(-1)!.trialDays).toBeNull();

      // The new one wins; a late event for the old one can't overwrite it.
      const renewed = stripe.completeCheckout(response.body.url, {
        created: Math.floor(Date.now() / 1000) + 60,
      });
      await sendWebhook("customer.subscription.created", { id: renewed.id }).expect(200);
      expect(await me(tokenA)).toMatchObject({ plan: "ANNUAL", status: "ACTIVE" });

      await sendWebhook("customer.subscription.deleted", { id: subscriptionId }).expect(200);
      expect(await me(tokenA)).toMatchObject({ plan: "ANNUAL", status: "ACTIVE" });
    });
  });

  it("keeps each user's subscription to themselves", async () => {
    expect(await me(tokenB)).toBeNull();
    await http().post("/subscriptions/cancel").set(as(tokenB)).expect(404);
  });

  it("ignores a subscription whose metadata points at a user of another customer", async () => {
    const userB = await prisma.user.findUniqueOrThrow({ where: { email: emailB } });
    const userA = await prisma.user.findUniqueOrThrow({ where: { email: emailA } });
    // A subscription on A's customer that claims (metadata) to be B's.
    const forged = stripe.completeCheckout(
      (
        await http()
          .post("/subscriptions/checkout")
          .set(as(tokenB))
          .send({ plan: "MONTHLY" })
          .expect(200)
      ).body.url,
      { customerId: userA.stripeCustomerId!, metadataUserId: userB.id, created: 1 },
    );
    await sendWebhook("customer.subscription.created", { id: forged.id }).expect(200);
    // Attributed to A's customer (A keeps the newer annual one), never to B.
    expect(await me(tokenB)).toBeNull();
  });

  it("never attributes a subscription by metadata to a user without a customer", async () => {
    const userC = await prisma.user.findUniqueOrThrow({ where: { email: emailC } });
    expect(userC.stripeCustomerId).toBeNull();
    const now = Math.floor(Date.now() / 1000);
    stripe.subscriptions.set("sub_test_foreign", {
      id: "sub_test_foreign",
      customerId: "cus_test_foreign",
      status: "active",
      priceId: "price_test_monthly",
      created: now,
      currentPeriodEnd: now + 30 * 86_400,
      trialEnd: null,
      cancelAtPeriodEnd: false,
      cancelAt: null,
      metadataUserId: userC.id,
    });
    await sendWebhook("customer.subscription.created", { id: "sub_test_foreign" }).expect(200);
    expect(await me(tokenC)).toBeNull();
  });

  it("refuses a second checkout while Stripe's webhook is on its way, and catches up", async () => {
    const first = await http()
      .post("/subscriptions/checkout")
      .set(as(tokenC))
      .send({ plan: "MONTHLY" })
      .expect(200);
    // Paid on Stripe (another device, or a slow webhook): nothing local yet.
    stripe.completeCheckout(first.body.url);
    expect(await me(tokenC)).toBeNull();

    await http()
      .post("/subscriptions/checkout")
      .set(as(tokenC))
      .send({ plan: "ANNUAL" })
      .expect(409);
    expect(await me(tokenC)).toMatchObject({ plan: "MONTHLY", status: "TRIALING" });
  });

  it("re-syncs a stale row when Stripe refuses a change", async () => {
    // Stripe ended C's subscription; that webhook got lost.
    const userC = await prisma.user.findUniqueOrThrow({ where: { email: emailC } });
    const ended = [...stripe.subscriptions.values()].find(
      (subscription) => subscription.customerId === userC.stripeCustomerId,
    )!;
    stripe.subscriptions.set(ended.id, { ...ended, status: "canceled" });
    expect((await me(tokenC)).status).toBe("TRIALING");

    await http().post("/subscriptions/cancel").set(as(tokenC)).expect(502);
    expect((await me(tokenC)).status).toBe("CANCELED");
  });

  it("grants the trial once, by what Stripe knows, even if no webhook ever arrived", async () => {
    const first = await http()
      .post("/subscriptions/checkout")
      .set(as(tokenD))
      .send({ plan: "MONTHLY" })
      .expect(200);
    expect([...stripe.sessions.values()].at(-1)!.trialDays).toBe(7);
    const subscription = stripe.completeCheckout(first.body.url);
    stripe.subscriptions.set(subscription.id, { ...subscription, status: "canceled" });

    await http()
      .post("/subscriptions/checkout")
      .set(as(tokenD))
      .send({ plan: "MONTHLY" })
      .expect(200);
    expect([...stripe.sessions.values()].at(-1)!.trialDays).toBeNull();
  });

  it("answers 502 with a generic message when Stripe fails", async () => {
    stripe.failNext = new Error("Stripe is down");
    const response = await http()
      .post("/subscriptions/checkout")
      .set(as(tokenB))
      .send({ plan: "MONTHLY" })
      .expect(502);
    expect(JSON.stringify(response.body)).not.toMatch(/Stripe is down/);
  });
});
