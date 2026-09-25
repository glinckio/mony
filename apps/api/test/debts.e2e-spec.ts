import { INestApplication, ValidationPipe } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import request from "supertest";

import { AppModule } from "../src/app.module";
import { AllExceptionsFilter } from "../src/common/filters/all-exceptions.filter";
import { PrismaService } from "../src/prisma/prisma.service";

interface InstallmentBody {
  id: string;
  installmentNo: number;
  amount: string;
  dueDate: string;
  status: "PENDING" | "PAID";
  paymentDate: string | null;
  transactionId: string | null;
}

interface TransactionBody {
  id: string;
  description: string;
  amount: string;
  status: string;
  date: string;
  categoryId: string;
}

interface DebtBody {
  id: string;
  name: string;
  status: string;
  categoryId: string | null;
  paidInstallments: number;
  installments: InstallmentBody[];
}

// Dates far in the past/future on purpose — the "due on/before today"
// rules stay deterministic whatever day the suite runs on.
describe("Debts (e2e)", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let accessToken: string;
  let expenseCategoryId: string;
  // Second user, for ownership checks that must hit lockDebt's raw SQL
  // (unit tests only mock $queryRaw).
  let accessTokenB: string;
  const email = `e2e-debts-${Date.now()}@example.com`;
  const emailB = `e2e-debts-b-${Date.now()}@example.com`;
  const password = "correcthorsebattery";

  const auth = () => ({ Authorization: `Bearer ${accessToken}` });
  const authB = () => ({ Authorization: `Bearer ${accessTokenB}` });

  const createDebt = async (
    body: Record<string, unknown>,
    headers = auth(),
  ): Promise<DebtBody> =>
    (await request(app.getHttpServer()).post("/debts").set(headers).send(body).expect(201)).body;

  const createCategory = async (
    name: string,
    type: "INCOME" | "EXPENSE",
    headers = auth(),
  ): Promise<string> =>
    (
      await request(app.getHttpServer())
        .post("/categories")
        .set(headers)
        .send({ name, type, icon: "cash-outline" })
        .expect(201)
    ).body.id;

  // Straight from the DB — GET /transactions is workspace-scoped and
  // paginated, which some checks below need to see past.
  const linkedTransactions = (debtId: string) =>
    prisma.transaction.findMany({
      where: { debtInstallment: { is: { debtId } } },
      orderBy: { date: "asc" },
    });

  const searchTransactions = async (search: string): Promise<TransactionBody[]> => {
    const response = await request(app.getHttpServer())
      .get(`/transactions?search=${encodeURIComponent(search)}&perPage=100&sortBy=date&sortOrder=asc`)
      .set(auth())
      .expect(200);
    return response.body.items;
  };

  const getDebt = async (id: string) =>
    (await request(app.getHttpServer()).get(`/debts/${id}`).set(auth()).expect(200)).body;

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

    const registerB = await request(app.getHttpServer()).post("/auth/register").send({
      name: "E2E Tester B",
      email: emailB,
      password,
      passwordConfirmation: password,
    });
    accessTokenB = registerB.body.accessToken;
  });

  afterAll(async () => {
    for (const userEmail of [email, emailB]) {
      const user = await prisma.user.findUnique({ where: { email: userEmail } });
      if (user) {
        await prisma.debt.deleteMany({ where: { userId: user.id } });
        await prisma.transaction.deleteMany({ where: { userId: user.id } });
        await prisma.category.deleteMany({ where: { userId: user.id } });
      }
    }
    await prisma.user.deleteMany({ where: { email: { in: [email, emailB] } } });
    await app.close();
  });

  it("rejects an unauthenticated request with 401", () => {
    return request(app.getHttpServer()).get("/debts").expect(401);
  });

  it("rejects a debt without categoryId when the user has no expense category yet", async () => {
    await request(app.getHttpServer())
      .post("/debts")
      .set(auth())
      .send({ name: "Sem categoria", totalAmount: 100, totalInstallments: 2, startDate: "2099-01-10" })
      .expect(400);

    const category = await request(app.getHttpServer())
      .post("/categories")
      .set(auth())
      .send({ name: "Financiamentos", type: "EXPENSE", icon: "car-outline" })
      .expect(201);
    expenseCategoryId = category.body.id;
  });

  it("rejects an income category, a sub-cent split, and a timestamp-shaped date", async () => {
    const income = await request(app.getHttpServer())
      .post("/categories")
      .set(auth())
      .send({ name: "Salário", type: "INCOME", icon: "cash-outline" })
      .expect(201);

    const base = { name: "Inválida", totalAmount: 100, totalInstallments: 2, startDate: "2099-01-10" };
    await request(app.getHttpServer())
      .post("/debts")
      .set(auth())
      .send({ ...base, categoryId: income.body.id })
      .expect(400);
    await request(app.getHttpServer())
      .post("/debts")
      .set(auth())
      .send({ ...base, totalAmount: 0.01 })
      .expect(400);
    await request(app.getHttpServer())
      .post("/debts")
      .set(auth())
      .send({ ...base, startDate: "2099-01-10T00:00:00.000Z" })
      .expect(400);
  });

  describe("full lifecycle of a future debt", () => {
    let debtId: string;
    let installments: InstallmentBody[];

    it("creates installments split to the cent, each with a linked PENDING expense", async () => {
      const response = await request(app.getHttpServer())
        .post("/debts")
        .set(auth())
        .send({
          name: "Carro E2E",
          totalAmount: 1000,
          totalInstallments: 3,
          startDate: "2099-01-10",
          interestRate: 1.99,
          categoryId: expenseCategoryId,
        })
        .expect(201);

      debtId = response.body.id;
      installments = response.body.installments;
      expect(response.body).toMatchObject({
        name: "Carro E2E",
        totalAmount: "1000.00",
        paidAmount: "0.00",
        remainingAmount: "1000.00",
        interestRate: "1.99",
        totalInstallments: 3,
        paidInstallments: 0,
        status: "ACTIVE",
      });
      expect(installments.map((i) => [i.installmentNo, i.amount, i.dueDate, i.status])).toEqual([
        [1, "333.33", "2099-01-10", "PENDING"],
        [2, "333.33", "2099-02-10", "PENDING"],
        [3, "333.34", "2099-03-10", "PENDING"],
      ]);

      const transactions = await searchTransactions("Carro E2E");
      expect(transactions.map((t) => [t.description, t.amount, t.date, t.status])).toEqual([
        ["Parcela 1/3 - Carro E2E", "333.33", "2099-01-10", "PENDING"],
        ["Parcela 2/3 - Carro E2E", "333.33", "2099-02-10", "PENDING"],
        ["Parcela 3/3 - Carro E2E", "333.34", "2099-03-10", "PENDING"],
      ]);
      expect(transactions.map((t) => t.id)).toEqual(installments.map((i) => i.transactionId));
    });

    it("lists it in the active workspace", async () => {
      const response = await request(app.getHttpServer()).get("/debts").set(auth()).expect(200);
      expect(response.body.map((debt: { id: string }) => debt.id)).toContain(debtId);
      expect(response.body[0]).not.toHaveProperty("installments");
    });

    it("pays an installment and keeps its transaction in sync", async () => {
      const response = await request(app.getHttpServer())
        .post(`/debts/${debtId}/installments/${installments[0]!.id}/pay`)
        .set(auth())
        .send({ paymentDate: "2099-01-05", paidAmount: 333.33 })
        .expect(200);

      expect(response.body).toMatchObject({
        paidAmount: "333.33",
        remainingAmount: "666.67",
        paidInstallments: 1,
        status: "ACTIVE",
      });
      expect(response.body.installments[0]).toMatchObject({
        status: "PAID",
        paymentDate: "2099-01-05",
        amount: "333.33",
      });

      const [first] = await searchTransactions("Parcela 1/3 - Carro E2E");
      expect(first).toMatchObject({ status: "PAID", date: "2099-01-05" });
    });

    it("rejects paying the same installment twice, and structural edits once something is paid", async () => {
      await request(app.getHttpServer())
        .post(`/debts/${debtId}/installments/${installments[0]!.id}/pay`)
        .set(auth())
        .send({ paymentDate: "2099-01-05", paidAmount: 333.33 })
        .expect(400);
      await request(app.getHttpServer())
        .patch(`/debts/${debtId}`)
        .set(auth())
        .send({ totalInstallments: 6 })
        .expect(400);
      await request(app.getHttpServer())
        .patch(`/debts/${debtId}`)
        .set(auth())
        .send({ startDate: "2099-02-10" })
        .expect(400);
    });

    it("recalculates only pending installments (and their transactions) when the total changes", async () => {
      const response = await request(app.getHttpServer())
        .patch(`/debts/${debtId}`)
        .set(auth())
        .send({ totalAmount: 1333.33 })
        .expect(200);

      expect(response.body.installments.map((i: InstallmentBody) => i.amount)).toEqual([
        "333.33",
        "500.00",
        "500.00",
      ]);
      const transactions = await searchTransactions("Carro E2E");
      expect(transactions.map((t) => t.amount)).toEqual(["333.33", "500.00", "500.00"]);
    });

    it("cancels a payment, reverting the transaction to pending instead of deleting it", async () => {
      const response = await request(app.getHttpServer())
        .post(`/debts/${debtId}/installments/${installments[0]!.id}/cancel-payment`)
        .set(auth())
        .expect(200);

      expect(response.body).toMatchObject({ paidAmount: "0.00", paidInstallments: 0 });
      expect(response.body.installments[0]).toMatchObject({ status: "PENDING", paymentDate: null });

      const [first] = await searchTransactions("Parcela 1/3 - Carro E2E");
      expect(first).toMatchObject({ id: installments[0]!.transactionId, status: "PENDING" });

      await request(app.getHttpServer())
        .post(`/debts/${debtId}/installments/${installments[0]!.id}/cancel-payment`)
        .set(auth())
        .expect(400);
    });

    it("pays/unpays the installment when its linked transaction's status is toggled", async () => {
      await request(app.getHttpServer())
        .patch(`/transactions/${installments[1]!.transactionId}/status`)
        .set(auth())
        .send({ status: "PAID" })
        .expect(200);

      let debt = await getDebt(debtId);
      expect(debt).toMatchObject({ paidInstallments: 1, paidAmount: "500.00" });
      expect(debt.installments[1].status).toBe("PAID");
      expect(debt.installments[1].paymentDate).not.toBeNull();

      await request(app.getHttpServer())
        .patch(`/transactions/${installments[1]!.transactionId}/status`)
        .set(auth())
        .send({ status: "PENDING" })
        .expect(200);

      debt = await getDebt(debtId);
      expect(debt).toMatchObject({ paidInstallments: 0, paidAmount: "0.00" });
      expect(debt.installments[1]).toMatchObject({ status: "PENDING", paymentDate: null });
    });

    it("propagates a rename to the linked transactions", async () => {
      await request(app.getHttpServer())
        .patch(`/debts/${debtId}`)
        .set(auth())
        .send({ name: "Jeep E2E" })
        .expect(200);

      const transactions = await searchTransactions("Jeep E2E");
      expect(transactions.map((t) => t.description)).toEqual([
        "Parcela 1/3 - Jeep E2E",
        "Parcela 2/3 - Jeep E2E",
        "Parcela 3/3 - Jeep E2E",
      ]);
    });

    it("regenerates installments and transactions when the count changes and nothing is paid", async () => {
      const response = await request(app.getHttpServer())
        .patch(`/debts/${debtId}`)
        .set(auth())
        .send({ totalInstallments: 4, totalAmount: 1000 })
        .expect(200);

      installments = response.body.installments;
      expect(installments.map((i) => i.amount)).toEqual(["250.00", "250.00", "250.00", "250.00"]);
      const transactions = await searchTransactions("Jeep E2E");
      expect(transactions).toHaveLength(4);
      expect(transactions.map((t) => t.description)).toContain("Parcela 4/4 - Jeep E2E");
    });

    it("recreates a deleted linked transaction when the installment is paid", async () => {
      await request(app.getHttpServer())
        .delete(`/transactions/${installments[0]!.transactionId}`)
        .set(auth())
        .expect(204);

      let debt = await getDebt(debtId);
      expect(debt.installments[0].transactionId).toBeNull();

      debt = (
        await request(app.getHttpServer())
          .post(`/debts/${debtId}/installments/${installments[0]!.id}/pay`)
          .set(auth())
          .send({ paymentDate: "2099-01-10", paidAmount: 249.99 })
          .expect(200)
      ).body;
      expect(debt.installments[0].transactionId).not.toBeNull();
      // Installment amount untouched; the new transaction carries paidAmount.
      expect(debt.installments[0].amount).toBe("250.00");
      const [recreated] = await searchTransactions("Parcela 1/4 - Jeep E2E");
      expect(recreated).toMatchObject({ amount: "249.99", status: "PAID", date: "2099-01-10" });
    });

    it("is PAID_OFF once every installment is paid", async () => {
      for (const installment of installments.slice(1)) {
        await request(app.getHttpServer())
          .post(`/debts/${debtId}/installments/${installment.id}/pay`)
          .set(auth())
          .send({ paymentDate: installment.dueDate, paidAmount: 250 })
          .expect(200);
      }
      const debt = await getDebt(debtId);
      expect(debt).toMatchObject({
        status: "PAID_OFF",
        paidInstallments: 4,
        paidAmount: "1000.00",
        remainingAmount: "0.00",
      });

      const paidOff = await request(app.getHttpServer())
        .get("/debts?status=PAID_OFF")
        .set(auth())
        .expect(200);
      expect(paidOff.body.map((d: { id: string }) => d.id)).toEqual([debtId]);
    });

    it("deletes the debt together with its linked transactions", async () => {
      await request(app.getHttpServer()).delete(`/debts/${debtId}`).set(auth()).expect(204);
      await request(app.getHttpServer()).get(`/debts/${debtId}`).set(auth()).expect(404);
      expect(await searchTransactions("Jeep E2E")).toHaveLength(0);
    });
  });

  it("creates a debt already OVERDUE when its first installment is past due (legacy-literal)", async () => {
    const response = await request(app.getHttpServer())
      .post("/debts")
      .set(auth())
      .send({ name: "Antiga E2E", totalAmount: 200, totalInstallments: 2, startDate: "2020-01-10" })
      .expect(201);

    expect(response.body.status).toBe("OVERDUE");
    expect(response.body.categoryId).toBeNull();
    expect(response.body.installments.map((i: InstallmentBody) => i.status)).toEqual([
      "PENDING",
      "PENDING",
    ]);
    const transactions = await searchTransactions("Antiga E2E");
    expect(transactions.map((t) => t.status)).toEqual(["PAID", "PAID"]);
    // Fell back to the user's oldest expense category.
    expect(transactions.map((t) => t.categoryId)).toEqual([expenseCategoryId, expenseCategoryId]);
  });

  it("flips a stale ACTIVE debt to OVERDUE when read", async () => {
    const created = await request(app.getHttpServer())
      .post("/debts")
      .set(auth())
      .send({ name: "Vencendo E2E", totalAmount: 100, totalInstallments: 1, startDate: "2099-01-10" })
      .expect(201);
    expect(created.body.status).toBe("ACTIVE");

    // Simulate time passing: the installment's due date is now behind us.
    await prisma.debtInstallment.updateMany({
      where: { debtId: created.body.id },
      data: { dueDate: new Date("2020-01-10T00:00:00.000Z") },
    });

    const list = await request(app.getHttpServer()).get("/debts?status=OVERDUE").set(auth()).expect(200);
    expect(list.body.map((d: { id: string }) => d.id)).toContain(created.body.id);
  });

  it("reassigns debts when their category is deleted with a replacement", async () => {
    const replacement = await request(app.getHttpServer())
      .post("/categories")
      .set(auth())
      .send({ name: "Empréstimos", type: "EXPENSE", icon: "cash-outline" })
      .expect(201);
    const debt = await request(app.getHttpServer())
      .post("/debts")
      .set(auth())
      .send({
        name: "Reatribuída E2E",
        totalAmount: 100,
        totalInstallments: 1,
        startDate: "2099-01-10",
        categoryId: expenseCategoryId,
      })
      .expect(201);

    await request(app.getHttpServer())
      .delete(`/categories/${expenseCategoryId}?replacementCategoryId=${replacement.body.id}`)
      .set(auth())
      .expect(204);

    expect((await getDebt(debt.body.id)).categoryId).toBe(replacement.body.id);
  });

  it("404s for a debt that doesn't exist or isn't the user's", async () => {
    const missing = "00000000-0000-4000-8000-000000000000";
    await request(app.getHttpServer()).get(`/debts/${missing}`).set(auth()).expect(404);
    await request(app.getHttpServer()).delete(`/debts/${missing}`).set(auth()).expect(404);
    await request(app.getHttpServer())
      .post(`/debts/${missing}/installments/${missing}/pay`)
      .set(auth())
      .send({ paymentDate: "2099-01-10", paidAmount: 10 })
      .expect(404);
  });

  it("validates installment bounds, the status filter, the pay payload, and endDate ordering", async () => {
    const server = app.getHttpServer();
    const base = { name: "Limites E2E", totalAmount: 100, startDate: "2099-01-10" };

    for (const totalInstallments of [0, 421, 1.5]) {
      await request(server)
        .post("/debts")
        .set(auth())
        .send({ ...base, totalInstallments })
        .expect(400);
    }
    // CANCELLED was dropped from DebtStatus (product.md).
    await request(server).get("/debts?status=CANCELLED").set(auth()).expect(400);
    await request(server)
      .post("/debts")
      .set(auth())
      .send({ ...base, totalInstallments: 2, endDate: "2099-01-09" })
      .expect(400);

    const debt = await createDebt({ ...base, totalInstallments: 2, endDate: "2099-02-10" });
    // endDate is checked against the start date the debt would end up with.
    await request(server)
      .patch(`/debts/${debt.id}`)
      .set(auth())
      .send({ startDate: "2099-03-10" })
      .expect(400);
    await request(server)
      .patch(`/debts/${debt.id}`)
      .set(auth())
      .send({ endDate: "2099-01-09" })
      .expect(400);

    const payUrl = `/debts/${debt.id}/installments/${debt.installments[0]!.id}/pay`;
    for (const body of [
      { paymentDate: "2099-01-10", paidAmount: 0 },
      { paymentDate: "2099-01-10", paidAmount: -5 },
      { paymentDate: "10/01/2099", paidAmount: 50 },
      { paidAmount: 50 },
    ]) {
      await request(server).post(payUrl).set(auth()).send(body).expect(400);
    }

    const after = await getDebt(debt.id);
    expect(after).toMatchObject({ startDate: "2099-01-10", endDate: "2099-02-10", paidInstallments: 0 });
    expect(after.installments.map((i: InstallmentBody) => i.id)).toEqual(
      debt.installments.map((i) => i.id),
    );
  });

  it("generates the maximum 420 installments, each with a linked transaction, summing exactly", async () => {
    // Longest allowed name, so the longest possible description is written too.
    const name = "Financiamento imobiliário E2E ".padEnd(100, "x");
    const debt = await createDebt({
      name,
      totalAmount: 1000,
      totalInstallments: 420,
      startDate: "2099-01-10",
    });

    expect(debt.installments).toHaveLength(420);
    const totalCents = debt.installments.reduce(
      (sum, installment) => sum + Math.round(Number(installment.amount) * 100),
      0,
    );
    expect(totalCents).toBe(100000);
    expect(debt.installments[0]!.amount).toBe("2.38");
    // 2099-01 + 419 months = 2133-12; 1000 - 2.38 x 419 = 2.78.
    expect(debt.installments[419]).toMatchObject({
      installmentNo: 420,
      amount: "2.78",
      dueDate: "2133-12-10",
    });

    const transactions = await linkedTransactions(debt.id);
    expect(transactions).toHaveLength(420);
    expect(transactions.at(-1)!.description).toBe(`Parcela 420/420 - ${name}`);

    await request(app.getHttpServer()).delete(`/debts/${debt.id}`).set(auth()).expect(204);
  });

  describe("PATCH null handling", () => {
    it("rejects null for a non-nullable field with 400 and regenerates nothing", async () => {
      const debt = await createDebt({
        name: "Nula E2E",
        totalAmount: 300,
        totalInstallments: 3,
        startDate: "2099-01-10",
      });

      // startDate: null used to read as "changed" and silently regenerate
      // every installment (and its linked transaction).
      for (const field of ["startDate", "name", "totalAmount", "totalInstallments"]) {
        await request(app.getHttpServer())
          .patch(`/debts/${debt.id}`)
          .set(auth())
          .send({ [field]: null })
          .expect(400);
      }

      const after = await getDebt(debt.id);
      expect(after).toMatchObject({
        name: "Nula E2E",
        totalAmount: "300.00",
        totalInstallments: 3,
        startDate: "2099-01-10",
      });
      expect(after.installments.map((i: InstallmentBody) => [i.id, i.transactionId])).toEqual(
        debt.installments.map((i) => [i.id, i.transactionId]),
      );
    });

    it("clears nullable fields with null, leaving linked transactions' category alone", async () => {
      const categoryId = await createCategory("Crediário", "EXPENSE");
      const debt = await createDebt({
        name: "Limpa E2E",
        totalAmount: 300,
        totalInstallments: 3,
        startDate: "2099-01-10",
        endDate: "2099-03-10",
        interestRate: 2.5,
        notes: "Boleto",
        categoryId,
      });

      const endDateOnly = await request(app.getHttpServer())
        .patch(`/debts/${debt.id}`)
        .set(auth())
        .send({ endDate: null })
        .expect(200);
      expect(endDateOnly.body).toMatchObject({ endDate: null, interestRate: "2.50", notes: "Boleto" });

      const response = await request(app.getHttpServer())
        .patch(`/debts/${debt.id}`)
        .set(auth())
        .send({ interestRate: null, notes: null, categoryId: null })
        .expect(200);
      expect(response.body).toMatchObject({
        endDate: null,
        interestRate: null,
        notes: null,
        categoryId: null,
      });
      // Not a regeneration.
      expect(response.body.installments.map((i: InstallmentBody) => i.id)).toEqual(
        debt.installments.map((i) => i.id),
      );
      const transactions = await linkedTransactions(debt.id);
      expect(transactions.map((t) => t.categoryId)).toEqual([categoryId, categoryId, categoryId]);
    });
  });

  it("moves every linked transaction to a new category, rejecting income or unknown ones", async () => {
    const server = app.getHttpServer();
    const debt = await createDebt({
      name: "Recategorizada E2E",
      totalAmount: 200,
      totalInstallments: 2,
      startDate: "2099-01-10",
    });
    const vehicles = await createCategory("Veículos", "EXPENSE");

    const response = await request(server)
      .patch(`/debts/${debt.id}`)
      .set(auth())
      .send({ categoryId: vehicles })
      .expect(200);
    expect(response.body.categoryId).toBe(vehicles);
    expect((await linkedTransactions(debt.id)).map((t) => t.categoryId)).toEqual([
      vehicles,
      vehicles,
    ]);

    const income = await createCategory("Freelas", "INCOME");
    await request(server).patch(`/debts/${debt.id}`).set(auth()).send({ categoryId: income }).expect(400);
    await request(server)
      .patch(`/debts/${debt.id}`)
      .set(auth())
      .send({ categoryId: "00000000-0000-4000-8000-000000000000" })
      .expect(404);
    expect((await linkedTransactions(debt.id)).map((t) => t.categoryId)).toEqual([
      vehicles,
      vehicles,
    ]);
  });

  it("refreshes a stale status on GET /debts/:id too", async () => {
    const debt = await createDebt({
      name: "Detalhe vencido E2E",
      totalAmount: 100,
      totalInstallments: 1,
      startDate: "2099-01-10",
    });
    expect(debt.status).toBe("ACTIVE");

    await prisma.debtInstallment.updateMany({
      where: { debtId: debt.id },
      data: { dueDate: new Date("2020-01-10T00:00:00.000Z") },
    });

    expect((await getDebt(debt.id)).status).toBe("OVERDUE");
  });

  it("doesn't flip a debt to OVERDUE when its only past-due installment is paid", async () => {
    const debt = await createDebt({
      name: "Em dia E2E",
      totalAmount: 200,
      totalInstallments: 2,
      startDate: "2099-01-10",
    });
    await request(app.getHttpServer())
      .post(`/debts/${debt.id}/installments/${debt.installments[0]!.id}/pay`)
      .set(auth())
      .send({ paymentDate: "2099-01-10", paidAmount: 100 })
      .expect(200);

    await prisma.debtInstallment.update({
      where: { id: debt.installments[0]!.id },
      data: { dueDate: new Date("2020-01-10T00:00:00.000Z") },
    });

    expect((await getDebt(debt.id)).status).toBe("ACTIVE");
    const active = await request(app.getHttpServer())
      .get("/debts?status=ACTIVE")
      .set(auth())
      .expect(200);
    expect(active.body.map((d: { id: string }) => d.id)).toContain(debt.id);
  });

  it("serializes concurrent payments: the same installment is paid once, different ones both count", async () => {
    const debt = await createDebt({
      name: "Concorrência E2E",
      totalAmount: 300,
      totalInstallments: 3,
      startDate: "2099-01-10",
    });
    const pay = (installment: InstallmentBody) =>
      request(app.getHttpServer())
        .post(`/debts/${debt.id}/installments/${installment.id}/pay`)
        .set(auth())
        .send({ paymentDate: "2099-01-10", paidAmount: 100 });
    const [first, second, third] = debt.installments as [
      InstallmentBody,
      InstallmentBody,
      InstallmentBody,
    ];

    const doubleTap = await Promise.all([pay(first), pay(first)]);
    expect(doubleTap.map((response) => response.status).sort()).toEqual([200, 400]);

    const parallel = await Promise.all([pay(second), pay(third)]);
    expect(parallel.map((response) => response.status)).toEqual([200, 200]);

    // Neither recompute ran on a snapshot missing the other's payment.
    expect(await getDebt(debt.id)).toMatchObject({
      paidInstallments: 3,
      paidAmount: "300.00",
      remainingAmount: "0.00",
      status: "PAID_OFF",
    });
  });

  it("regenerating or deleting one debt never touches the user's other transactions", async () => {
    const server = app.getHttpServer();
    const categoryId = await createCategory("Moradia", "EXPENSE");
    const standalone = await request(server)
      .post("/transactions")
      .set(auth())
      .send({
        type: "EXPENSE",
        categoryId,
        description: "Aluguel E2E",
        amount: 1500,
        date: "2099-01-05",
      })
      .expect(201);
    const kept = await createDebt({
      name: "Mantida E2E",
      totalAmount: 200,
      totalInstallments: 2,
      startDate: "2099-01-10",
    });
    const target = await createDebt({
      name: "Alvo E2E",
      totalAmount: 200,
      totalInstallments: 2,
      startDate: "2099-01-10",
    });

    const regenerated = await request(server)
      .patch(`/debts/${target.id}`)
      .set(auth())
      .send({ totalInstallments: 4 })
      .expect(200);
    const targetTransactionIds = regenerated.body.installments.map(
      (i: InstallmentBody) => i.transactionId,
    );
    expect(await linkedTransactions(target.id)).toHaveLength(4);
    // The replaced transactions went with the old installments.
    expect(
      await prisma.transaction.count({
        where: { id: { in: target.installments.map((i) => i.transactionId!) } },
      }),
    ).toBe(0);

    await request(server).delete(`/debts/${target.id}`).set(auth()).expect(204);

    expect(await prisma.debtInstallment.count({ where: { debtId: target.id } })).toBe(0);
    expect(await prisma.transaction.count({ where: { id: { in: targetTransactionIds } } })).toBe(0);
    expect(await prisma.transaction.findUnique({ where: { id: standalone.body.id } })).not.toBeNull();
    expect((await linkedTransactions(kept.id)).map((t) => t.id)).toEqual(
      kept.installments.map((i) => i.transactionId),
    );
  });

  describe("second-user ownership", () => {
    let debtA: DebtBody;
    let debtB: DebtBody;
    let categoryA: string;

    beforeAll(async () => {
      categoryA = await createCategory("Cartão A", "EXPENSE");
      debtA = await createDebt({
        name: "Privada E2E",
        totalAmount: 300,
        totalInstallments: 3,
        startDate: "2099-01-10",
        categoryId: categoryA,
      });
      // Installment 1 paid and 2 pending, so a leaked cancel-payment/pay
      // would succeed (200) instead of failing on status (400).
      await request(app.getHttpServer())
        .post(`/debts/${debtA.id}/installments/${debtA.installments[0]!.id}/pay`)
        .set(auth())
        .send({ paymentDate: "2099-01-10", paidAmount: 100 })
        .expect(200);

      await createCategory("Contas B", "EXPENSE", authB());
      debtB = await createDebt(
        { name: "Dívida B E2E", totalAmount: 100, totalInstallments: 1, startDate: "2099-01-10" },
        authB(),
      );
    });

    const expectDebtAUntouched = async () => {
      const debt = await getDebt(debtA.id);
      expect(debt).toMatchObject({ name: "Privada E2E", paidInstallments: 1 });
      expect(debt.installments.map((i: InstallmentBody) => i.status)).toEqual([
        "PAID",
        "PENDING",
        "PENDING",
      ]);
      expect(await linkedTransactions(debtA.id)).toHaveLength(3);
    };

    it("404s every by-id debt route on another user's debt", async () => {
      const server = app.getHttpServer();
      const [paid, pending] = debtA.installments as [InstallmentBody, InstallmentBody];

      await request(server).get(`/debts/${debtA.id}`).set(authB()).expect(404);
      await request(server)
        .patch(`/debts/${debtA.id}`)
        .set(authB())
        .send({ name: "Invadida" })
        .expect(404);
      await request(server)
        .post(`/debts/${debtA.id}/installments/${pending.id}/pay`)
        .set(authB())
        .send({ paymentDate: "2099-02-10", paidAmount: 100 })
        .expect(404);
      await request(server)
        .post(`/debts/${debtA.id}/installments/${paid.id}/cancel-payment`)
        .set(authB())
        .expect(404);
      await request(server).delete(`/debts/${debtA.id}`).set(authB()).expect(404);

      const listB = await request(server).get("/debts").set(authB()).expect(200);
      expect(listB.body.map((d: { id: string }) => d.id)).toEqual([debtB.id]);
      await expectDebtAUntouched();
    });

    it("404s another user's installment addressed through the caller's own debt", async () => {
      const server = app.getHttpServer();
      const [paid, pending] = debtA.installments as [InstallmentBody, InstallmentBody];

      await request(server)
        .post(`/debts/${debtB.id}/installments/${pending.id}/pay`)
        .set(authB())
        .send({ paymentDate: "2099-02-10", paidAmount: 100 })
        .expect(404);
      await request(server)
        .post(`/debts/${debtB.id}/installments/${paid.id}/cancel-payment`)
        .set(authB())
        .expect(404);

      await expectDebtAUntouched();
      const ownDebt = await request(server).get(`/debts/${debtB.id}`).set(authB()).expect(200);
      expect(ownDebt.body.paidInstallments).toBe(0);
    });

    it("404s another user's category, and toggling another user's linked transaction", async () => {
      const server = app.getHttpServer();

      await request(server)
        .post("/debts")
        .set(authB())
        .send({
          name: "Categoria alheia",
          totalAmount: 100,
          totalInstallments: 1,
          startDate: "2099-01-10",
          categoryId: categoryA,
        })
        .expect(404);
      await request(server)
        .patch(`/debts/${debtB.id}`)
        .set(authB())
        .send({ categoryId: categoryA })
        .expect(404);
      await request(server)
        .patch(`/transactions/${debtA.installments[1]!.transactionId}/status`)
        .set(authB())
        .send({ status: "PAID" })
        .expect(404);

      await expectDebtAUntouched();
    });

    it("lists only the active workspace's debts, while by-id routes stay reachable", async () => {
      const server = app.getHttpServer();
      await request(server)
        .patch("/users/me/workspace")
        .set(authB())
        .send({ workspace: "BUSINESS" })
        .expect(200);

      const business = await createDebt(
        { name: "Empresa E2E", totalAmount: 100, totalInstallments: 1, startDate: "2099-01-10" },
        authB(),
      );
      expect((await linkedTransactions(business.id)).map((t) => t.workspace)).toEqual([
        "BUSINESS",
      ]);
      const inBusiness = await request(server).get("/debts").set(authB()).expect(200);
      expect(inBusiness.body.map((d: { id: string }) => d.id)).toEqual([business.id]);

      await request(server)
        .patch("/users/me/workspace")
        .set(authB())
        .send({ workspace: "PERSONAL" })
        .expect(200);

      const inPersonal = await request(server).get("/debts").set(authB()).expect(200);
      expect(inPersonal.body.map((d: { id: string }) => d.id)).toEqual([debtB.id]);
      await request(server).get(`/debts/${business.id}`).set(authB()).expect(200);
    });
  });
});
