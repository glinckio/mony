import { INestApplication, ValidationPipe } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import type { Prisma } from "@prisma/client";
import request from "supertest";

import { AppModule } from "../src/app.module";
import { AllExceptionsFilter } from "../src/common/filters/all-exceptions.filter";
import {
  addMonthsToDateString,
  parseDateOnly,
  startOfMonthDateString,
  todayDateOnlyString,
} from "../src/common/utils/date.util";
import { PrismaService } from "../src/prisma/prisma.service";

describe("Reports (e2e)", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let token: string;
  let otherToken: string;
  let userId: string;
  let otherUserId: string;
  const stamp = Date.now();
  const email = `e2e-reports-${stamp}@example.com`;
  const otherEmail = `e2e-reports-other-${stamp}@example.com`;
  const password = "correcthorsebattery";
  const today = todayDateOnlyString();
  // A closed past quarter, so the range tests don't depend on today.
  const RANGE = { dateFrom: "2025-01-01", dateTo: "2025-03-31" };
  const categories: Record<string, string> = {};

  const http = () => request(app.getHttpServer());
  const report = (query: Record<string, string> = {}, as = token) =>
    http().get("/reports").query(query).set("Authorization", `Bearer ${as}`);
  const register = async (address: string) =>
    (
      await http()
        .post("/auth/register")
        .send({ name: "E2E Tester", email: address, password, passwordConfirmation: password })
        .expect(201)
    ).body.accessToken as string;
  const weekdayOf = (date: string) => parseDateOnly(date).getUTCDay();

  const tx = (
    overrides: Partial<Prisma.TransactionUncheckedCreateInput> & {
      categoryId: string;
      type: "INCOME" | "EXPENSE";
      amount: string;
      date: string;
    },
  ): Prisma.TransactionUncheckedCreateInput => ({
    userId,
    workspace: "PERSONAL",
    status: "PAID",
    description: "e2e",
    ...overrides,
    date: parseDateOnly(overrides.date),
  });

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

    token = await register(email);
    otherToken = await register(otherEmail);
    userId = (await prisma.user.findUniqueOrThrow({ where: { email } })).id;
    otherUserId = (await prisma.user.findUniqueOrThrow({ where: { email: otherEmail } })).id;

    const make = async (name: string, type: "INCOME" | "EXPENSE", owner = userId) => {
      const category = await prisma.category.create({
        data: { userId: owner, name, type, color: "#5550F0", icon: "pricetag" },
      });
      categories[name] = category.id;
    };
    for (const name of ["Salário", "Freela"]) await make(name, "INCOME");
    for (const name of ["Aluguel", "Mercado", "Luz", "Internet", "Farmácia", "Cinema", "Café"]) {
      await make(name, "EXPENSE");
    }
    await make("Outro usuário", "EXPENSE", otherUserId);

    await prisma.transaction.createMany({
      data: [
        // Income (any status counts).
        tx({
          categoryId: categories.Salário!,
          type: "INCOME",
          amount: "3000.00",
          date: "2025-01-05",
        }),
        tx({
          categoryId: categories.Freela!,
          type: "INCOME",
          amount: "500.00",
          date: "2025-02-10",
          status: "PENDING",
        }),
        // Paid expenses: seven categories, so the top 5 cuts two.
        tx({
          categoryId: categories.Aluguel!,
          type: "EXPENSE",
          amount: "1200.00",
          date: "2025-01-05",
        }),
        tx({
          categoryId: categories.Mercado!,
          type: "EXPENSE",
          amount: "600.00",
          date: "2025-01-18",
        }),
        tx({
          categoryId: categories.Mercado!,
          type: "EXPENSE",
          amount: "150.00",
          date: "2025-03-01",
        }),
        tx({ categoryId: categories.Luz!, type: "EXPENSE", amount: "200.00", date: "2025-02-10" }),
        tx({
          categoryId: categories.Internet!,
          type: "EXPENSE",
          amount: "100.00",
          date: "2025-02-12",
        }),
        tx({
          categoryId: categories.Farmácia!,
          type: "EXPENSE",
          amount: "80.00",
          date: "2025-03-03",
        }),
        tx({
          categoryId: categories.Cinema!,
          type: "EXPENSE",
          amount: "40.00",
          date: "2025-03-08",
        }),
        tx({ categoryId: categories.Café!, type: "EXPENSE", amount: "10.00", date: "2025-03-09" }),
        // Excluded: a pending expense, the other notebook, the other user,
        // and the days just outside the range.
        tx({
          categoryId: categories.Aluguel!,
          type: "EXPENSE",
          amount: "9999.00",
          date: "2025-01-20",
          status: "PENDING",
        }),
        tx({
          categoryId: categories.Salário!,
          type: "INCOME",
          amount: "7777.00",
          date: "2025-01-06",
          workspace: "BUSINESS",
        }),
        tx({
          userId: otherUserId,
          categoryId: categories["Outro usuário"]!,
          type: "EXPENSE",
          amount: "5555.00",
          date: "2025-01-07",
        }),
        tx({ categoryId: categories.Café!, type: "EXPENSE", amount: "1.00", date: "2024-12-31" }),
        tx({ categoryId: categories.Café!, type: "EXPENSE", amount: "1.00", date: "2025-04-01" }),
      ],
    });
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { email: { in: [email, otherEmail] } } });
    await app.close();
  });

  it("requires a login", async () => {
    await http().get("/reports").expect(401);
  });

  it("sums the range: all income, paid expenses only, in the active notebook", async () => {
    const { body } = await report(RANGE).expect(200);
    expect(body.dateFrom).toBe("2025-01-01");
    expect(body.dateTo).toBe("2025-03-31");
    // 1200 + 600 + 150 + 200 + 100 + 80 + 40 + 10 = 2380 (the 9999 pending is out).
    expect(body.summary).toEqual({
      totalIncome: "3500.00",
      totalExpensesPaid: "2380.00",
      balance: "1120.00",
      expenseRatio: 2380 / 3500,
    });
  });

  it("groups by month, oldest first", async () => {
    const { body } = await report(RANGE).expect(200);
    expect(body.monthly).toEqual([
      { month: "2025-01", income: "3000.00", expensesPaid: "1800.00", balance: "1200.00" },
      { month: "2025-02", income: "500.00", expensesPaid: "300.00", balance: "200.00" },
      { month: "2025-03", income: "0.00", expensesPaid: "280.00", balance: "-280.00" },
    ]);
  });

  it("counts both ends of the range, and a 0 ratio without income", async () => {
    // 2025-03-01 (Mercado 150, a Saturday) and 2025-03-09 (Café 10, a
    // Sunday) are the range's own ends; no income in between.
    const { body } = await report({ dateFrom: "2025-03-01", dateTo: "2025-03-09" }).expect(200);
    expect(body.summary).toEqual({
      totalIncome: "0.00",
      totalExpensesPaid: "280.00",
      balance: "-280.00",
      expenseRatio: 0,
    });
    expect(body.monthly).toEqual([
      { month: "2025-03", income: "0.00", expensesPaid: "280.00", balance: "-280.00" },
    ]);
    expect(
      body.topExpenseCategories.map((c: { name: string; total: string }) => [c.name, c.total]),
    ).toEqual([
      ["Mercado", "150.00"],
      ["Farmácia", "80.00"],
      ["Cinema", "40.00"],
      ["Café", "10.00"],
    ]);
    expect(body.topIncomeCategories).toEqual([]);
    // Sunday 03-09: 10; Monday 03-03: 80; Saturdays 03-01 and 03-08: 150 + 40.
    expect(weekdayOf("2025-03-01")).toBe(6);
    expect(weekdayOf("2025-03-09")).toBe(0);
    expect(body.expensesByWeekday.map((d: { total: string }) => d.total)).toEqual([
      "10.00",
      "80.00",
      "0.00",
      "0.00",
      "0.00",
      "0.00",
      "190.00",
    ]);
  });

  it("keeps the top 5 categories, largest first (paid expenses)", async () => {
    const { body } = await report(RANGE).expect(200);
    expect(
      body.topExpenseCategories.map((c: { name: string; total: string }) => [c.name, c.total]),
    ).toEqual([
      ["Aluguel", "1200.00"],
      ["Mercado", "750.00"],
      ["Luz", "200.00"],
      ["Internet", "100.00"],
      ["Farmácia", "80.00"],
    ]);
    expect(body.topExpenseCategories[0]).toMatchObject({ color: "#5550F0", icon: "pricetag" });
    expect(body.topIncomeCategories.map((c: { name: string }) => c.name)).toEqual([
      "Salário",
      "Freela",
    ]);
  });

  it("spreads paid expenses over the seven weekdays, Sunday first", async () => {
    const { body } = await report(RANGE).expect(200);
    expect(body.expensesByWeekday).toHaveLength(7);
    expect(body.expensesByWeekday.map((d: { weekday: number }) => d.weekday)).toEqual([
      0, 1, 2, 3, 4, 5, 6,
    ]);
    const expected = new Array(7).fill(0);
    for (const [date, amount] of [
      ["2025-01-05", 1200],
      ["2025-01-18", 600],
      ["2025-03-01", 150],
      ["2025-02-10", 200],
      ["2025-02-12", 100],
      ["2025-03-03", 80],
      ["2025-03-08", 40],
      ["2025-03-09", 10],
    ] as const) {
      expected[weekdayOf(date)] += amount;
    }
    expect(body.expensesByWeekday.map((d: { total: string }) => Number(d.total))).toEqual(expected);
  });

  it("defaults to the current month", async () => {
    const { body } = await report().expect(200);
    expect(body.dateFrom).toBe(startOfMonthDateString(today));
    expect(body.dateTo.slice(0, 7)).toBe(today.slice(0, 7));
  });

  it("charts the last 12 months up to the current one, never later", async () => {
    const thisMonth = startOfMonthDateString(today);
    const elevenAgo = addMonthsToDateString(thisMonth, -11);
    await prisma.transaction.createMany({
      data: [
        tx({ categoryId: categories.Salário!, type: "INCOME", amount: "100.00", date: elevenAgo }),
        tx({ categoryId: categories.Salário!, type: "INCOME", amount: "40.00", date: thisMonth }),
        tx({
          categoryId: categories.Salário!,
          type: "INCOME",
          amount: "999.00",
          date: addMonthsToDateString(thisMonth, 1),
        }),
        tx({
          categoryId: categories.Salário!,
          type: "INCOME",
          amount: "999.00",
          date: addMonthsToDateString(thisMonth, -12),
        }),
        // Paid expenses count here too; pending ones don't.
        tx({ categoryId: categories.Luz!, type: "EXPENSE", amount: "25.00", date: thisMonth }),
        tx({
          categoryId: categories.Luz!,
          type: "EXPENSE",
          amount: "888.00",
          date: thisMonth,
          status: "PENDING",
        }),
      ],
    });
    const { body } = await report(RANGE).expect(200);
    expect(body.last12Months).toHaveLength(12);
    expect(body.last12Months[0]).toEqual({
      month: elevenAgo.slice(0, 7),
      income: "100.00",
      expensesPaid: "0.00",
    });
    expect(body.last12Months[11]).toEqual({
      month: today.slice(0, 7),
      income: "40.00",
      expensesPaid: "25.00",
    });
  });

  it("leaves out a month that only has pending expenses", async () => {
    // Recurring expenses are generated ahead as pending: those months
    // aren't months of the report (and an only-pending range is empty).
    await prisma.transaction.create({
      data: tx({
        categoryId: categories.Luz!,
        type: "EXPENSE",
        amount: "300.00",
        date: "2025-06-10",
        status: "PENDING",
      }),
    });
    const onlyPending = await report({ dateFrom: "2025-06-01", dateTo: "2025-06-30" }).expect(200);
    expect(onlyPending.body.monthly).toEqual([]);
    const withIt = await report({ dateFrom: "2025-01-01", dateTo: "2025-06-30" }).expect(200);
    expect(withIt.body.monthly.map((month: { month: string }) => month.month)).toEqual([
      "2025-01",
      "2025-02",
      "2025-03",
      "2025-04",
    ]);
  });

  it("answers an empty range with zeros, not an error", async () => {
    const { body } = await report({ dateFrom: "2010-01-01", dateTo: "2010-01-31" }).expect(200);
    expect(body.summary).toEqual({
      totalIncome: "0.00",
      totalExpensesPaid: "0.00",
      balance: "0.00",
      expenseRatio: 0,
    });
    expect(body.monthly).toEqual([]);
    expect(body.topExpenseCategories).toEqual([]);
    expect(body.topIncomeCategories).toEqual([]);
    expect(body.expensesByWeekday.every((d: { total: string }) => d.total === "0.00")).toBe(true);
  });

  it("shows other users nothing of this one's", async () => {
    const { body } = await report(RANGE, otherToken).expect(200);
    expect(body.summary.totalIncome).toBe("0.00");
    expect(body.summary.totalExpensesPaid).toBe("5555.00");
    expect(body.topExpenseCategories.map((c: { name: string }) => c.name)).toEqual([
      "Outro usuário",
    ]);
  });

  it("never names another user's category, even if a row points at it", async () => {
    // Only reachable by a bug or a manual fix today (every write path checks
    // ownership), which is exactly why the lookup is scoped too.
    await prisma.transaction.create({
      data: tx({
        categoryId: categories["Outro usuário"]!,
        type: "EXPENSE",
        amount: "42.00",
        date: "2024-06-10",
      }),
    });
    const { body } = await report({ dateFrom: "2024-06-01", dateTo: "2024-06-30" }).expect(200);
    expect(JSON.stringify(body)).not.toContain("Outro usuário");
  });

  it("follows the active notebook", async () => {
    await prisma.user.update({ where: { id: userId }, data: { activeWorkspace: "BUSINESS" } });
    const { body } = await report(RANGE).expect(200);
    expect(body.summary.totalIncome).toBe("7777.00");
    expect(body.summary.totalExpensesPaid).toBe("0.00");
    await prisma.user.update({ where: { id: userId }, data: { activeWorkspace: "PERSONAL" } });
  });

  it("rejects half a range, an inverted one and malformed dates", async () => {
    await report({ dateFrom: "2025-01-01" }).expect(400);
    await report({ dateFrom: "2025-03-01", dateTo: "2025-01-01" }).expect(400);
    await report({ dateFrom: "2025-1-01", dateTo: "2025-01-31" }).expect(400);
    await report({ dateFrom: "2025-02-30", dateTo: "2025-03-01" }).expect(400);
  });

  it("names the range problem in the 400, either date missing", async () => {
    const onlyTo = await report({ dateTo: "2025-01-31" }).expect(400);
    expect(onlyTo.body.message).toEqual(["dateFrom and dateTo must be given together."]);
    const onlyFrom = await report({ dateFrom: "2025-01-01" }).expect(400);
    expect(onlyFrom.body.message).toEqual(["dateFrom and dateTo must be given together."]);
    const inverted = await report({ dateFrom: "2025-03-01", dateTo: "2025-01-01" }).expect(400);
    expect(inverted.body.message).toEqual(["dateFrom must not be after dateTo."]);
  });

  it("rejects empty dates and unknown parameters (Swagger's other 400s)", async () => {
    await report({ dateFrom: "", dateTo: "" }).expect(400);
    await report({ dateFrom: "2025-01-01", dateTo: "" }).expect(400);
    await report({ period: "month" }).expect(400);
  });
});
