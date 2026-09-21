import { INestApplication, ValidationPipe } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import request from "supertest";

import { AppModule } from "../src/app.module";
import { AllExceptionsFilter } from "../src/common/filters/all-exceptions.filter";
import { PrismaService } from "../src/prisma/prisma.service";

describe("Goals (e2e)", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let accessToken: string;
  const email = `e2e-goals-${Date.now()}@example.com`;
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
  });

  afterAll(async () => {
    const user = await prisma.user.findUnique({ where: { email } });
    if (user) {
      await prisma.goal.deleteMany({ where: { userId: user.id } });
    }
    await prisma.user.deleteMany({ where: { email } });
    await app.close();
  });

  it("rejects an unauthenticated request with 401", () => {
    return request(app.getHttpServer()).get("/goals").expect(401);
  });

  it("creates a goal defaulting currentAmount to 0", async () => {
    const response = await request(app.getHttpServer())
      .post("/goals")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ title: "Viagem para a praia", targetAmount: 5000 })
      .expect(201);

    expect(response.body).toMatchObject({
      title: "Viagem para a praia",
      targetAmount: "5000.00",
      currentAmount: "0.00",
      completed: false,
      progressPercent: 0,
    });
  });

  it("updates progress and computes progressPercent", async () => {
    const created = await request(app.getHttpServer())
      .post("/goals")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ title: "Carro novo", targetAmount: 1000 });

    const response = await request(app.getHttpServer())
      .patch(`/goals/${created.body.id}`)
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ currentAmount: 300 })
      .expect(200);

    expect(response.body.currentAmount).toBe("300.00");
    expect(response.body.progressPercent).toBe(30);
  });

  it("marking a goal completed fills currentAmount to targetAmount", async () => {
    const created = await request(app.getHttpServer())
      .post("/goals")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ title: "Reserva de emergência", targetAmount: 2000 });

    const response = await request(app.getHttpServer())
      .patch(`/goals/${created.body.id}`)
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ completed: true })
      .expect(200);

    expect(response.body.completed).toBe(true);
    expect(response.body.currentAmount).toBe("2000.00");
    expect(response.body.progressPercent).toBe(100);
  });

  it("lists and filters by completed", async () => {
    const all = await request(app.getHttpServer())
      .get("/goals")
      .set("Authorization", `Bearer ${accessToken}`)
      .expect(200);
    expect(all.body.length).toBeGreaterThanOrEqual(3);

    const completedOnly = await request(app.getHttpServer())
      .get("/goals?completed=true")
      .set("Authorization", `Bearer ${accessToken}`)
      .expect(200);
    for (const goal of completedOnly.body) {
      expect(goal.completed).toBe(true);
    }
  });

  it("returns 404 updating/deleting a goal it doesn't own", async () => {
    const otherEmail = `e2e-goals-other-${Date.now()}@example.com`;
    const otherRegister = await request(app.getHttpServer()).post("/auth/register").send({
      name: "E2E Other",
      email: otherEmail,
      password,
      passwordConfirmation: password,
    });
    const otherToken = otherRegister.body.accessToken;
    const otherGoal = await request(app.getHttpServer())
      .post("/goals")
      .set("Authorization", `Bearer ${otherToken}`)
      .send({ title: "Only mine", targetAmount: 100 });

    await request(app.getHttpServer())
      .patch(`/goals/${otherGoal.body.id}`)
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ title: "Hijacked" })
      .expect(404);

    await request(app.getHttpServer())
      .delete(`/goals/${otherGoal.body.id}`)
      .set("Authorization", `Bearer ${accessToken}`)
      .expect(404);

    await prisma.goal.deleteMany({ where: { id: otherGoal.body.id } });
    await prisma.user.deleteMany({ where: { email: otherEmail } });
  });

  it("deletes a goal it owns", async () => {
    const created = await request(app.getHttpServer())
      .post("/goals")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ title: "Descartável", targetAmount: 100 });

    await request(app.getHttpServer())
      .delete(`/goals/${created.body.id}`)
      .set("Authorization", `Bearer ${accessToken}`)
      .expect(204);

    await request(app.getHttpServer())
      .patch(`/goals/${created.body.id}`)
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ title: "Should not exist" })
      .expect(404);
  });
});
