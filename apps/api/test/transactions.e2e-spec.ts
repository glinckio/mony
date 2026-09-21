import { INestApplication, ValidationPipe } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import request from "supertest";

import { AppModule } from "../src/app.module";
import { AllExceptionsFilter } from "../src/common/filters/all-exceptions.filter";
import { PrismaService } from "../src/prisma/prisma.service";

describe("Transactions (e2e)", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let accessToken: string;
  let expenseCategoryId: string;
  let incomeCategoryId: string;
  const email = `e2e-transactions-${Date.now()}@example.com`;
  const password = "correcthorsebattery";

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

    const register = await request(app.getHttpServer()).post("/auth/register").send({
      name: "E2E Tester",
      email,
      password,
      passwordConfirmation: password,
    });
    accessToken = register.body.accessToken;

    const expenseCategory = await request(app.getHttpServer())
      .post("/categories")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ name: "Aluguel", type: "EXPENSE", icon: "home-outline" });
    expenseCategoryId = expenseCategory.body.id;

    const incomeCategory = await request(app.getHttpServer())
      .post("/categories")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ name: "Salário", type: "INCOME", icon: "cash-outline" });
    incomeCategoryId = incomeCategory.body.id;
  });

  afterAll(async () => {
    const user = await prisma.user.findUnique({ where: { email } });
    if (user) {
      await prisma.transaction.deleteMany({ where: { userId: user.id } });
      await prisma.category.deleteMany({ where: { userId: user.id } });
    }
    await prisma.user.deleteMany({ where: { email } });
    await app.close();
  });

  it("rejects an unauthenticated request with 401", () => {
    return request(app.getHttpServer()).get("/transactions").expect(401);
  });

  it("creates an expense defaulting to PENDING", async () => {
    const response = await request(app.getHttpServer())
      .post("/transactions")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({
        categoryId: expenseCategoryId,
        type: "EXPENSE",
        description: "Aluguel de janeiro",
        amount: 1500.5,
        date: "2026-01-05",
      })
      .expect(201);

    expect(response.body).toMatchObject({
      type: "EXPENSE",
      status: "PENDING",
      description: "Aluguel de janeiro",
      amount: "1500.50",
      recurring: false,
    });
  });

  it("forces PAID status for income regardless of what's submitted", async () => {
    const response = await request(app.getHttpServer())
      .post("/transactions")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({
        categoryId: incomeCategoryId,
        type: "INCOME",
        status: "PENDING",
        description: "Salário de janeiro",
        amount: 5000,
        date: "2026-01-05",
      })
      .expect(201);

    expect(response.body.status).toBe("PAID");
  });

  it("rejects a category/type mismatch with 400", () => {
    return request(app.getHttpServer())
      .post("/transactions")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({
        categoryId: incomeCategoryId,
        type: "EXPENSE",
        description: "Mismatch",
        amount: 10,
        date: "2026-01-05",
      })
      .expect(400);
  });

  it("creates a recurring expense and generates every month's row", async () => {
    const response = await request(app.getHttpServer())
      .post("/transactions")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({
        categoryId: expenseCategoryId,
        type: "EXPENSE",
        description: "Internet",
        amount: 100,
        date: "2026-02-01",
        recurring: true,
        recurringMonths: 3,
      })
      .expect(201);

    expect(Array.isArray(response.body)).toBe(true);
    expect(response.body).toHaveLength(3);
    expect(response.body[0].description).toBe("Internet");
    expect(response.body[0].recurring).toBe(true);
    expect(response.body[1].description).toBe("Internet (2/3)");
    expect(response.body[1].recurring).toBe(false);
    expect(response.body[1].status).toBe("PENDING");
    expect(response.body[2].date).toBe("2026-04-01");

    const list = await request(app.getHttpServer())
      .get("/transactions?search=Internet&perPage=10")
      .set("Authorization", `Bearer ${accessToken}`)
      .expect(200);
    expect(list.body.items).toHaveLength(3);
  });

  it("lists, filters by type, and paginates", async () => {
    const response = await request(app.getHttpServer())
      .get("/transactions?type=INCOME&page=1&perPage=20")
      .set("Authorization", `Bearer ${accessToken}`)
      .expect(200);

    expect(response.body.items.length).toBeGreaterThan(0);
    for (const item of response.body.items) {
      expect(item.type).toBe("INCOME");
    }
  });

  it("rejects an unknown sortBy value with 400", () => {
    return request(app.getHttpServer())
      .get("/transactions?sortBy=userId")
      .set("Authorization", `Bearer ${accessToken}`)
      .expect(400);
  });

  it("changes an expense's status", async () => {
    const created = await request(app.getHttpServer())
      .post("/transactions")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({
        categoryId: expenseCategoryId,
        type: "EXPENSE",
        description: "Conta de luz",
        amount: 200,
        date: "2026-01-10",
      });

    const response = await request(app.getHttpServer())
      .patch(`/transactions/${created.body.id}/status`)
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ status: "PAID" })
      .expect(200);

    expect(response.body.status).toBe("PAID");
  });

  it("rejects a status change on income with 400", async () => {
    const created = await request(app.getHttpServer())
      .post("/transactions")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({
        categoryId: incomeCategoryId,
        type: "INCOME",
        description: "Freelance",
        amount: 300,
        date: "2026-01-10",
      });

    await request(app.getHttpServer())
      .patch(`/transactions/${created.body.id}/status`)
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ status: "PENDING" })
      .expect(400);
  });

  it("computes the summary for a date range", async () => {
    const response = await request(app.getHttpServer())
      .get("/transactions/summary?dateFrom=2026-01-01&dateTo=2026-01-31")
      .set("Authorization", `Bearer ${accessToken}`)
      .expect(200);

    expect(response.body).toEqual({
      totalIncome: expect.stringMatching(/^\d+\.\d{2}$/),
      totalExpensesPaid: expect.stringMatching(/^\d+\.\d{2}$/),
      totalExpensesPending: expect.stringMatching(/^\d+\.\d{2}$/),
      balance: expect.stringMatching(/^-?\d+\.\d{2}$/),
    });
  });

  it("deletes a transaction it owns", async () => {
    const created = await request(app.getHttpServer())
      .post("/transactions")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({
        categoryId: expenseCategoryId,
        type: "EXPENSE",
        description: "Descartável",
        amount: 10,
        date: "2026-01-10",
      });

    await request(app.getHttpServer())
      .delete(`/transactions/${created.body.id}`)
      .set("Authorization", `Bearer ${accessToken}`)
      .expect(204);
  });

  it("bulk-deletes all-or-nothing", async () => {
    const first = await request(app.getHttpServer())
      .post("/transactions")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({
        categoryId: expenseCategoryId,
        type: "EXPENSE",
        description: "Bulk 1",
        amount: 10,
        date: "2026-01-10",
      });
    const second = await request(app.getHttpServer())
      .post("/transactions")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({
        categoryId: expenseCategoryId,
        type: "EXPENSE",
        description: "Bulk 2",
        amount: 20,
        date: "2026-01-10",
      });

    await request(app.getHttpServer())
      .post("/transactions/bulk-delete")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ ids: [first.body.id, second.body.id] })
      .expect(204);

    const list = await request(app.getHttpServer())
      .get("/transactions?search=Bulk")
      .set("Authorization", `Bearer ${accessToken}`)
      .expect(200);
    expect(list.body.items).toHaveLength(0);
  });

  it("rejects bulk-delete with 400 when an id isn't owned by the user", async () => {
    const otherEmail = `e2e-transactions-other-${Date.now()}@example.com`;
    const otherRegister = await request(app.getHttpServer()).post("/auth/register").send({
      name: "E2E Other",
      email: otherEmail,
      password,
      passwordConfirmation: password,
    });
    const otherToken = otherRegister.body.accessToken;
    const otherCategory = await request(app.getHttpServer())
      .post("/categories")
      .set("Authorization", `Bearer ${otherToken}`)
      .send({ name: "Only mine", type: "EXPENSE", icon: "bag-outline" });
    const otherTransaction = await request(app.getHttpServer())
      .post("/transactions")
      .set("Authorization", `Bearer ${otherToken}`)
      .send({
        categoryId: otherCategory.body.id,
        type: "EXPENSE",
        description: "Not yours",
        amount: 10,
        date: "2026-01-10",
      });

    await request(app.getHttpServer())
      .post("/transactions/bulk-delete")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ ids: [otherTransaction.body.id] })
      .expect(400);

    await prisma.transaction.deleteMany({ where: { id: otherTransaction.body.id } });
    await prisma.category.deleteMany({ where: { id: otherCategory.body.id } });
    await prisma.user.deleteMany({ where: { email: otherEmail } });
  });

  it("blocks deleting a category in use, then reassigns and deletes with a replacement", async () => {
    const category = await request(app.getHttpServer())
      .post("/categories")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ name: "Em uso", type: "EXPENSE", icon: "bag-outline" });
    const replacement = await request(app.getHttpServer())
      .post("/categories")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ name: "Substituta", type: "EXPENSE", icon: "bag-outline" });
    const transaction = await request(app.getHttpServer())
      .post("/transactions")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({
        categoryId: category.body.id,
        type: "EXPENSE",
        description: "Presa a categoria",
        amount: 10,
        date: "2026-01-10",
      });

    await request(app.getHttpServer())
      .delete(`/categories/${category.body.id}`)
      .set("Authorization", `Bearer ${accessToken}`)
      .expect(400);

    await request(app.getHttpServer())
      .delete(`/categories/${category.body.id}?replacementCategoryId=${replacement.body.id}`)
      .set("Authorization", `Bearer ${accessToken}`)
      .expect(204);

    const updated = await prisma.transaction.findUnique({ where: { id: transaction.body.id } });
    expect(updated?.categoryId).toBe(replacement.body.id);
  });
});
