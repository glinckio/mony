import { INestApplication, ValidationPipe } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import request from "supertest";

import { AppModule } from "../src/app.module";
import { AllExceptionsFilter } from "../src/common/filters/all-exceptions.filter";
import { PrismaService } from "../src/prisma/prisma.service";

describe("User Profile (e2e)", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let accessToken: string;
  const email = `e2e-profile-${Date.now()}@example.com`;
  const otherEmail = `e2e-profile-other-${Date.now()}@example.com`;
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

    await request(app.getHttpServer()).post("/auth/register").send({
      name: "E2E Tester",
      email: otherEmail,
      password,
      passwordConfirmation: password,
    });

    const register = await request(app.getHttpServer()).post("/auth/register").send({
      name: "E2E Tester",
      email,
      password,
      passwordConfirmation: password,
    });
    accessToken = register.body.accessToken;
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { email: { in: [email, otherEmail] } } });
    await app.close();
  });

  it("rejects an unauthenticated request with 401", () => {
    return request(app.getHttpServer()).get("/users/me").expect(401);
  });

  it("returns the current user's profile", async () => {
    const response = await request(app.getHttpServer())
      .get("/users/me")
      .set("Authorization", `Bearer ${accessToken}`)
      .expect(200);

    expect(response.body).toMatchObject({ name: "E2E Tester", email, activeWorkspace: "PERSONAL" });
  });

  it("updates the profile", async () => {
    const response = await request(app.getHttpServer())
      .patch("/users/me")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ name: "Updated Name", phone: "11987654321" })
      .expect(200);

    expect(response.body).toMatchObject({ name: "Updated Name", phone: "11987654321" });
  });

  it("rejects changing the email to one already registered", () => {
    return request(app.getHttpServer())
      .patch("/users/me")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ email: otherEmail })
      .expect(409);
  });

  it("switches the active workspace", async () => {
    const response = await request(app.getHttpServer())
      .patch("/users/me/workspace")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ workspace: "BUSINESS" })
      .expect(200);

    expect(response.body.activeWorkspace).toBe("BUSINESS");
  });

  it("rejects a password change with the wrong current password", () => {
    return request(app.getHttpServer())
      .post("/users/me/change-password")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({
        currentPassword: "wrong-password",
        newPassword: "new-correct-horse",
        newPasswordConfirmation: "new-correct-horse",
      })
      .expect(400);
  });

  it("changes the password and allows logging in with the new one", async () => {
    await request(app.getHttpServer())
      .post("/users/me/change-password")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({
        currentPassword: password,
        newPassword: "new-correct-horse",
        newPasswordConfirmation: "new-correct-horse",
      })
      .expect(204);

    await request(app.getHttpServer())
      .post("/auth/login")
      .send({ email, password: "new-correct-horse" })
      .expect(200);
  });
});
