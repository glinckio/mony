import { INestApplication, ValidationPipe } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import request from "supertest";

import { AppModule } from "../src/app.module";
import { AllExceptionsFilter } from "../src/common/filters/all-exceptions.filter";
import { todayDateOnlyString } from "../src/common/utils/date.util";
import { PrismaService } from "../src/prisma/prisma.service";

describe("Dashboard (e2e)", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let accessToken: string;
  let expenseCategoryId: string;
  let incomeCategoryId: string;
  const email = `e2e-dashboard-${Date.now()}@example.com`;
  const password = "correcthorsebattery";
  const today = todayDateOnlyString();

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

    await request(app.getHttpServer())
      .post("/transactions")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({
        type: "INCOME",
        categoryId: incomeCategoryId,
        description: "Salário",
        amount: 1000,
        date: today,
      });

    await request(app.getHttpServer())
      .post("/transactions")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({
        type: "EXPENSE",
        categoryId: expenseCategoryId,
        description: "Aluguel",
        amount: 400,
        status: "PAID",
        date: today,
      });

    await request(app.getHttpServer())
      .post("/goals")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ title: "Viagem", targetAmount: 5000 });
  });

  afterAll(async () => {
    const user = await prisma.user.findUnique({ where: { email } });
    if (user) {
      await prisma.transaction.deleteMany({ where: { userId: user.id } });
      await prisma.goal.deleteMany({ where: { userId: user.id } });
      await prisma.category.deleteMany({ where: { userId: user.id } });
    }
    await prisma.user.deleteMany({ where: { email } });
    await app.close();
  });

  it("rejects an unauthenticated request with 401", () => {
    return request(app.getHttpServer()).get("/dashboard").expect(401);
  });

  it("defaults to the current month and reflects created transactions and goals", async () => {
    const response = await request(app.getHttpServer())
      .get("/dashboard")
      .set("Authorization", `Bearer ${accessToken}`)
      .expect(200);

    expect(response.body.summary.totalIncome).toBe("1000.00");
    expect(response.body.summary.totalExpensesPaid).toBe("400.00");
    expect(response.body.summary.balance).toBe("600.00");
    expect(response.body.summary.expenseRatio).toBeCloseTo(0.4);

    expect(response.body.incompleteGoals).toHaveLength(1);
    expect(response.body.incompleteGoals[0]).toMatchObject({ title: "Viagem" });

    expect(response.body.yearlyBreakdown).toHaveLength(12);
    const currentMonth = Number(today.slice(5, 7));
    const monthEntry = response.body.yearlyBreakdown.find((m: { month: number }) => m.month === currentMonth);
    expect(monthEntry).toMatchObject({ income: "1000.00", expensesPaid: "400.00" });
  });

  it("accepts period=day and period=week", async () => {
    await request(app.getHttpServer())
      .get("/dashboard?period=day")
      .set("Authorization", `Bearer ${accessToken}`)
      .expect(200);

    await request(app.getHttpServer())
      .get("/dashboard?period=week")
      .set("Authorization", `Bearer ${accessToken}`)
      .expect(200);
  });

  it("rejects period=custom without dateFrom/dateTo", () => {
    return request(app.getHttpServer())
      .get("/dashboard?period=custom")
      .set("Authorization", `Bearer ${accessToken}`)
      .expect(400);
  });

  it("rejects period=custom with dateFrom after dateTo", () => {
    return request(app.getHttpServer())
      .get("/dashboard?period=custom&dateFrom=2026-02-01&dateTo=2026-01-01")
      .set("Authorization", `Bearer ${accessToken}`)
      .expect(400);
  });
});
