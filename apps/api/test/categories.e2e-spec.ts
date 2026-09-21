import { INestApplication, ValidationPipe } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import request from "supertest";

import { AppModule } from "../src/app.module";
import { AllExceptionsFilter } from "../src/common/filters/all-exceptions.filter";
import { PrismaService } from "../src/prisma/prisma.service";

describe("Categories (e2e)", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let accessToken: string;
  const email = `e2e-categories-${Date.now()}@example.com`;
  const password = "correcthorsebattery";

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
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
  });

  afterAll(async () => {
    const user = await prisma.user.findUnique({ where: { email } });
    if (user) {
      await prisma.category.deleteMany({ where: { userId: user.id } });
    }
    await prisma.user.deleteMany({ where: { email } });
    await app.close();
  });

  it("rejects an unauthenticated request with 401", () => {
    return request(app.getHttpServer()).get("/categories").expect(401);
  });

  it("starts with an empty category list", async () => {
    const response = await request(app.getHttpServer())
      .get("/categories")
      .set("Authorization", `Bearer ${accessToken}`)
      .expect(200);

    expect(response.body).toEqual([]);
  });

  it("creates a category", async () => {
    const response = await request(app.getHttpServer())
      .post("/categories")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ name: "Alimentação", type: "EXPENSE", icon: "restaurant-outline" })
      .expect(201);

    expect(response.body).toMatchObject({ name: "Alimentação", type: "EXPENSE" });
    expect(response.body.color).toMatch(/^#[0-9A-Fa-f]{6}$/);
  });

  it("rejects creating a category with an invalid icon", () => {
    return request(app.getHttpServer())
      .post("/categories")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ name: "Teste", type: "EXPENSE", icon: "not-a-real-icon" })
      .expect(400);
  });

  it("lists the created category, and filters by type", async () => {
    await request(app.getHttpServer())
      .post("/categories")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ name: "Salário", type: "INCOME", icon: "cash-outline" })
      .expect(201);

    const all = await request(app.getHttpServer())
      .get("/categories")
      .set("Authorization", `Bearer ${accessToken}`)
      .expect(200);
    expect(all.body).toHaveLength(2);

    const incomeOnly = await request(app.getHttpServer())
      .get("/categories?type=INCOME")
      .set("Authorization", `Bearer ${accessToken}`)
      .expect(200);
    expect(incomeOnly.body).toHaveLength(1);
    expect(incomeOnly.body[0].name).toBe("Salário");
  });

  it("updates a category it owns", async () => {
    const created = await request(app.getHttpServer())
      .post("/categories")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ name: "Transporte", type: "EXPENSE", icon: "car-outline" });

    const response = await request(app.getHttpServer())
      .patch(`/categories/${created.body.id}`)
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ name: "Transporte Público" })
      .expect(200);

    expect(response.body.name).toBe("Transporte Público");
  });

  it("returns 404 updating/deleting a category it doesn't own", async () => {
    const otherEmail = `e2e-categories-other-${Date.now()}@example.com`;
    const otherRegister = await request(app.getHttpServer()).post("/auth/register").send({
      name: "E2E Other",
      email: otherEmail,
      password,
      passwordConfirmation: password,
    });
    const otherToken = otherRegister.body.accessToken;

    const created = await request(app.getHttpServer())
      .post("/categories")
      .set("Authorization", `Bearer ${otherToken}`)
      .send({ name: "Only mine", type: "EXPENSE", icon: "bag-outline" });

    await request(app.getHttpServer())
      .patch(`/categories/${created.body.id}`)
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ name: "Hijacked" })
      .expect(404);

    await request(app.getHttpServer())
      .delete(`/categories/${created.body.id}`)
      .set("Authorization", `Bearer ${accessToken}`)
      .expect(404);

    await prisma.category.deleteMany({ where: { id: created.body.id } });
    await prisma.user.deleteMany({ where: { email: otherEmail } });
  });

  it("deletes a category it owns", async () => {
    const created = await request(app.getHttpServer())
      .post("/categories")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ name: "Descartável", type: "EXPENSE", icon: "bag-outline" });

    await request(app.getHttpServer())
      .delete(`/categories/${created.body.id}`)
      .set("Authorization", `Bearer ${accessToken}`)
      .expect(204);

    await request(app.getHttpServer())
      .patch(`/categories/${created.body.id}`)
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ name: "Should not exist" })
      .expect(404);
  });

  it("rejects a self-referencing or cross-type replacementCategoryId on delete", async () => {
    const expense = await request(app.getHttpServer())
      .post("/categories")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ name: "Lazer", type: "EXPENSE", icon: "game-controller-outline" });

    const income = await request(app.getHttpServer())
      .post("/categories")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ name: "Freelance", type: "INCOME", icon: "cash-outline" });

    await request(app.getHttpServer())
      .delete(`/categories/${expense.body.id}?replacementCategoryId=${expense.body.id}`)
      .set("Authorization", `Bearer ${accessToken}`)
      .expect(400);

    await request(app.getHttpServer())
      .delete(`/categories/${expense.body.id}?replacementCategoryId=${income.body.id}`)
      .set("Authorization", `Bearer ${accessToken}`)
      .expect(400);
  });
});
