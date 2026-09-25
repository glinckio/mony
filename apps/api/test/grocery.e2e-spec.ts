import { INestApplication, ValidationPipe } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import request from "supertest";

import { AppModule } from "../src/app.module";
import { AllExceptionsFilter } from "../src/common/filters/all-exceptions.filter";
import { PrismaService } from "../src/prisma/prisma.service";

describe("Grocery (e2e)", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let tokenA: string;
  let tokenB: string;
  let tokenC: string;
  const stamp = Date.now();
  const emailA = `e2e-grocery-a-${stamp}@example.com`;
  const emailB = `e2e-grocery-b-${stamp}@example.com`;
  const emailC = `e2e-grocery-c-${stamp}@example.com`;
  const password = "correcthorsebattery";

  const register = async (email: string): Promise<string> => {
    const response = await request(app.getHttpServer()).post("/auth/register").send({
      name: "E2E Tester",
      email,
      password,
      passwordConfirmation: password,
    });
    return response.body.accessToken;
  };

  const as = (token: string) => ({ Authorization: `Bearer ${token}` });

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
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
    tokenA = await register(emailA);
    tokenB = await register(emailB);
    tokenC = await register(emailC);
  });

  afterAll(async () => {
    // GroceryItem/GroceryBudget cascade with the user.
    await prisma.user.deleteMany({ where: { email: { in: [emailA, emailB, emailC] } } });
    await app.close();
  });

  it("rejects unauthenticated requests with 401", async () => {
    await request(app.getHttpServer()).get("/grocery/items").expect(401);
    await request(app.getHttpServer()).get("/grocery/budget").expect(401);
    await request(app.getHttpServer()).get("/grocery/summary").expect(401);
    await request(app.getHttpServer())
      .post("/grocery/items")
      .send({ name: "X", unit: "un", idealQuantity: 1, estimatedPrice: 1, category: "FOOD" })
      .expect(401);
    await request(app.getHttpServer())
      .patch("/grocery/items/00000000-0000-0000-0000-000000000000")
      .send({ currentQuantity: 1 })
      .expect(401);
    await request(app.getHttpServer())
      .delete("/grocery/items/00000000-0000-0000-0000-000000000000")
      .expect(401);
    await request(app.getHttpServer()).post("/grocery/budget").send({ amount: 100 }).expect(401);
  });

  it("starts empty: no items, no budget, zeroed summary", async () => {
    await request(app.getHttpServer()).get("/grocery/items").set(as(tokenA)).expect(200).expect([]);
    const budget = await request(app.getHttpServer())
      .get("/grocery/budget")
      .set(as(tokenA))
      .expect(200);
    expect(budget.body).toEqual({ amount: null, setAt: null });
    const summary = await request(app.getHttpServer())
      .get("/grocery/summary")
      .set(as(tokenA))
      .expect(200);
    expect(summary.body).toEqual({
      totalItemCount: 0,
      missingItemCount: 0,
      estimatedPurchaseTotal: "0.00",
    });
  });

  describe("items", () => {
    let riceId: string;

    it("creates items (trimmed, currentQuantity defaulting to 0) and lists them by category then name", async () => {
      const rice = await request(app.getHttpServer())
        .post("/grocery/items")
        .set(as(tokenA))
        .send({
          name: "  Arroz  ",
          unit: "kg",
          idealQuantity: 5,
          currentQuantity: 1.5,
          estimatedPrice: 6.49,
          category: "PANTRY",
        })
        .expect(201);
      riceId = rice.body.id;
      expect(rice.body).toMatchObject({
        name: "Arroz",
        idealQuantity: "5.00",
        currentQuantity: "1.50",
        estimatedPrice: "6.49",
        category: "PANTRY",
        missing: true,
      });

      const soap = await request(app.getHttpServer())
        .post("/grocery/items")
        .set(as(tokenA))
        .send({
          name: "Sabonete",
          unit: "un",
          idealQuantity: 4,
          estimatedPrice: 2.5,
          category: "PERSONAL_CARE",
        })
        .expect(201);
      expect(soap.body.currentQuantity).toBe("0.00");

      await request(app.getHttpServer())
        .post("/grocery/items")
        .set(as(tokenA))
        .send({
          name: "Detergente",
          unit: "un",
          idealQuantity: 2,
          currentQuantity: 3,
          estimatedPrice: 3,
          category: "CLEANING",
        })
        .expect(201);
      await request(app.getHttpServer())
        .post("/grocery/items")
        .set(as(tokenA))
        .send({
          name: "Feijão",
          unit: "kg",
          idealQuantity: 2,
          estimatedPrice: 8,
          category: "PANTRY",
        })
        .expect(201);

      const list = await request(app.getHttpServer())
        .get("/grocery/items")
        .set(as(tokenA))
        .expect(200);
      // Enum order = alphabetical order of the pt-BR labels:
      // Higiene Pessoal (PERSONAL_CARE) < Limpeza (CLEANING) < Mercearia (PANTRY).
      expect(list.body.map((item: { name: string }) => item.name)).toEqual([
        "Sabonete",
        "Detergente",
        "Arroz",
        "Feijão",
      ]);
    });

    it("summarizes missing items over the whole list", async () => {
      const summary = await request(app.getHttpServer())
        .get("/grocery/summary")
        .set(as(tokenA))
        .expect(200);
      // Arroz 3.5 x 6.49 = 22.715, Sabonete 4 x 2.50 = 10, Feijão 2 x 8 = 16
      // (Detergente is over stock) -> 48.715 -> 48.72
      expect(summary.body).toEqual({
        totalItemCount: 4,
        missingItemCount: 3,
        estimatedPurchaseTotal: "48.72",
      });
    });

    it("updates only the current quantity (quick stepper) and recomputes missing", async () => {
      const updated = await request(app.getHttpServer())
        .patch(`/grocery/items/${riceId}`)
        .set(as(tokenA))
        .send({ currentQuantity: 5 })
        .expect(200);
      expect(updated.body).toMatchObject({
        name: "Arroz",
        currentQuantity: "5.00",
        missing: false,
      });

      const summary = await request(app.getHttpServer())
        .get("/grocery/summary")
        .set(as(tokenA))
        .expect(200);
      expect(summary.body).toMatchObject({ missingItemCount: 2, estimatedPurchaseTotal: "26.00" });
    });

    it("rejects invalid input with 400", async () => {
      const base = {
        name: "Leite",
        unit: "l",
        idealQuantity: 6,
        estimatedPrice: 5.2,
        category: "DAIRY_AND_DELI",
      };
      for (const bad of [
        { ...base, category: "SNACKS" },
        { ...base, idealQuantity: -1 },
        { ...base, estimatedPrice: 1.999 },
        { ...base, unit: "x".repeat(31) },
        { ...base, name: "   " },
        { ...base, idealQuantity: 100_000_000 },
        { ...base, name: "x".repeat(101) },
        { ...base, currentQuantity: -0.5 },
        { ...base, currentQuantity: 1.555 },
        { name: "Leite", unit: "l", idealQuantity: 6, estimatedPrice: 5.2 },
        { name: "Leite", unit: "l", idealQuantity: 6, category: "DAIRY_AND_DELI" },
        { name: "Leite", unit: "l", estimatedPrice: 5.2, category: "DAIRY_AND_DELI" },
        { name: "Leite", idealQuantity: 6, estimatedPrice: 5.2, category: "DAIRY_AND_DELI" },
      ]) {
        await request(app.getHttpServer())
          .post("/grocery/items")
          .set(as(tokenA))
          .send(bad)
          .expect(400);
      }
      await request(app.getHttpServer())
        .patch(`/grocery/items/${riceId}`)
        .set(as(tokenA))
        .send({ currentQuantity: null })
        .expect(400);
      // The quick stepper can never push a quantity below 0 — server-side too.
      for (const bad of [
        { currentQuantity: -1 },
        { idealQuantity: -1 },
        { estimatedPrice: 0.001 },
        { category: "SNACKS" },
        { name: "" },
      ]) {
        await request(app.getHttpServer())
          .patch(`/grocery/items/${riceId}`)
          .set(as(tokenA))
          .send(bad)
          .expect(400);
      }
    });

    it("keeps items private: another user gets 404 and an empty list", async () => {
      await request(app.getHttpServer())
        .patch(`/grocery/items/${riceId}`)
        .set(as(tokenB))
        .send({ currentQuantity: 0 })
        .expect(404);
      await request(app.getHttpServer())
        .delete(`/grocery/items/${riceId}`)
        .set(as(tokenB))
        .expect(404);
      await request(app.getHttpServer())
        .get("/grocery/items")
        .set(as(tokenB))
        .expect(200)
        .expect([]);
      const otherSummary = await request(app.getHttpServer())
        .get("/grocery/summary")
        .set(as(tokenB))
        .expect(200);
      expect(otherSummary.body).toEqual({
        totalItemCount: 0,
        missingItemCount: 0,
        estimatedPurchaseTotal: "0.00",
      });
    });

    it("404s (not 500) for an unknown or malformed item id", async () => {
      await request(app.getHttpServer())
        .patch("/grocery/items/00000000-0000-0000-0000-000000000000")
        .set(as(tokenA))
        .send({ currentQuantity: 1 })
        .expect(404);
      await request(app.getHttpServer())
        .delete("/grocery/items/not-a-uuid")
        .set(as(tokenA))
        .expect(404);
    });

    it("deletes an item", async () => {
      await request(app.getHttpServer())
        .delete(`/grocery/items/${riceId}`)
        .set(as(tokenA))
        .expect(204);
      await request(app.getHttpServer())
        .delete(`/grocery/items/${riceId}`)
        .set(as(tokenA))
        .expect(404);
    });
  });

  describe("budget", () => {
    it("records every change as a new entry and reads the latest as current", async () => {
      const first = await request(app.getHttpServer())
        .post("/grocery/budget")
        .set(as(tokenA))
        .send({ amount: 800 })
        .expect(201);
      expect(first.body.amount).toBe("800.00");

      await request(app.getHttpServer())
        .post("/grocery/budget")
        .set(as(tokenA))
        .send({ amount: 650.5 })
        .expect(201);

      const current = await request(app.getHttpServer())
        .get("/grocery/budget")
        .set(as(tokenA))
        .expect(200);
      expect(current.body.amount).toBe("650.50");

      const user = await prisma.user.findUniqueOrThrow({ where: { email: emailA } });
      expect(await prisma.groceryBudget.count({ where: { userId: user.id } })).toBe(2);
    });

    it("accepts zero, rejects negatives, and is per user", async () => {
      await request(app.getHttpServer())
        .post("/grocery/budget")
        .set(as(tokenA))
        .send({ amount: -1 })
        .expect(400);
      for (const bad of [{ amount: 10.999 }, { amount: 10_000_000_000 }, {}]) {
        await request(app.getHttpServer())
          .post("/grocery/budget")
          .set(as(tokenA))
          .send(bad)
          .expect(400);
      }
      await request(app.getHttpServer())
        .post("/grocery/budget")
        .set(as(tokenB))
        .send({ amount: 0 })
        .expect(201);

      const other = await request(app.getHttpServer())
        .get("/grocery/budget")
        .set(as(tokenB))
        .expect(200);
      expect(other.body.amount).toBe("0.00");
      const mine = await request(app.getHttpServer())
        .get("/grocery/budget")
        .set(as(tokenA))
        .expect(200);
      expect(mine.body.amount).toBe("650.50");
    });
  });

  // Own user, so nothing here shifts the counts asserted above.
  describe("edge cases (separate user)", () => {
    it("accepts the documented boundaries: 100-char name, 30-char unit, zeros, 2 decimals", async () => {
      const zeros = await request(app.getHttpServer())
        .post("/grocery/items")
        .set(as(tokenC))
        .send({
          name: "n".repeat(100),
          unit: "u".repeat(30),
          idealQuantity: 0,
          currentQuantity: 0,
          estimatedPrice: 0,
          category: "HOUSEHOLD",
        })
        .expect(201);
      // 0 < 0 is false: an item with no ideal stock is never "missing".
      expect(zeros.body).toMatchObject({ idealQuantity: "0.00", missing: false });

      const max = await request(app.getHttpServer())
        .post("/grocery/items")
        .set(as(tokenC))
        .send({
          name: "Teto",
          unit: "kg",
          idealQuantity: 99_999_999.99,
          currentQuantity: 12.34,
          estimatedPrice: 99_999_999.99,
          category: "HOUSEHOLD",
        })
        .expect(201);
      expect(max.body).toMatchObject({
        idealQuantity: "99999999.99",
        currentQuantity: "12.34",
        estimatedPrice: "99999999.99",
      });

      for (const id of [zeros.body.id, max.body.id]) {
        await request(app.getHttpServer())
          .delete(`/grocery/items/${id}`)
          .set(as(tokenC))
          .expect(204);
      }
    });

    it("orders by name within a category regardless of insertion order", async () => {
      for (const name of ["Sal", "Macarrao", "Farinha"]) {
        await request(app.getHttpServer())
          .post("/grocery/items")
          .set(as(tokenC))
          .send({ name, unit: "kg", idealQuantity: 1, estimatedPrice: 1, category: "PANTRY" })
          .expect(201);
      }
      await request(app.getHttpServer())
        .post("/grocery/items")
        .set(as(tokenC))
        .send({ name: "Zebu", unit: "kg", idealQuantity: 1, estimatedPrice: 1, category: "MEAT" })
        .expect(201);

      const list = await request(app.getHttpServer())
        .get("/grocery/items")
        .set(as(tokenC))
        .expect(200);
      // MEAT (Carnes) sorts before PANTRY (Mercearia) even though "Zebu" > "Sal".
      expect(list.body.map((item: { name: string }) => item.name)).toEqual([
        "Zebu",
        "Farinha",
        "Macarrao",
        "Sal",
      ]);

      for (const item of list.body as Array<{ id: string }>) {
        await request(app.getHttpServer())
          .delete(`/grocery/items/${item.id}`)
          .set(as(tokenC))
          .expect(204);
      }
    });

    it("never blocks creating or editing items when the estimate exceeds the budget", async () => {
      await request(app.getHttpServer())
        .post("/grocery/budget")
        .set(as(tokenC))
        .send({ amount: 10 })
        .expect(201);

      // 10 x 50.00 = 500.00, far above the 10.00 budget.
      const created = await request(app.getHttpServer())
        .post("/grocery/items")
        .set(as(tokenC))
        .send({
          name: "Picanha",
          unit: "kg",
          idealQuantity: 10,
          estimatedPrice: 50,
          category: "MEAT",
        })
        .expect(201);

      await request(app.getHttpServer())
        .patch(`/grocery/items/${created.body.id}`)
        .set(as(tokenC))
        .send({ idealQuantity: 20 })
        .expect(200);

      const summary = await request(app.getHttpServer())
        .get("/grocery/summary")
        .set(as(tokenC))
        .expect(200);
      expect(summary.body).toEqual({
        totalItemCount: 1,
        missingItemCount: 1,
        estimatedPurchaseTotal: "1000.00",
      });
      const budget = await request(app.getHttpServer())
        .get("/grocery/budget")
        .set(as(tokenC))
        .expect(200);
      expect(budget.body.amount).toBe("10.00");
    });
  });
});
