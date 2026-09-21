import { INestApplication, ValidationPipe } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import request from "supertest";

import { AppModule } from "../src/app.module";
import { AllExceptionsFilter } from "../src/common/filters/all-exceptions.filter";
import { PrismaService } from "../src/prisma/prisma.service";

describe("Auth: Register (e2e)", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const email = `e2e-register-${Date.now()}@example.com`;

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
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { email: { in: [email, `empty-phone-${email}`] } } });
    await app.close();
  });

  it("registers a new user and returns a token pair", async () => {
    const response = await request(app.getHttpServer())
      .post("/auth/register")
      .send({
        name: "E2E Tester",
        email,
        password: "correcthorsebattery",
        passwordConfirmation: "correcthorsebattery",
      })
      .expect(201);

    expect(response.body.accessToken).toEqual(expect.any(String));
    expect(response.body.refreshToken).toEqual(expect.any(String));
    expect(response.body.user).toMatchObject({ email, activeWorkspace: "PERSONAL" });
  });

  it("rejects a duplicate email with 409", async () => {
    const response = await request(app.getHttpServer())
      .post("/auth/register")
      .send({
        name: "E2E Tester",
        email,
        password: "correcthorsebattery",
        passwordConfirmation: "correcthorsebattery",
      })
      .expect(409);

    expect(response.body.message).toContain("This email is already registered.");
  });

  it("rejects a mismatched password confirmation with 400", () => {
    return request(app.getHttpServer())
      .post("/auth/register")
      .send({
        name: "E2E Tester",
        email: `mismatch-${email}`,
        password: "correcthorsebattery",
        passwordConfirmation: "somethingElse",
      })
      .expect(400);
  });

  it("accepts an empty-string phone as if it were omitted", () => {
    return request(app.getHttpServer())
      .post("/auth/register")
      .send({
        name: "E2E Tester",
        email: `empty-phone-${email}`,
        password: "correcthorsebattery",
        passwordConfirmation: "correcthorsebattery",
        phone: "",
      })
      .expect(201);
  });
});
