import { INestApplication, ValidationPipe } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import * as bcrypt from "bcryptjs";
import request from "supertest";

import { AppModule } from "../src/app.module";
import { AllExceptionsFilter } from "../src/common/filters/all-exceptions.filter";
import { PrismaService } from "../src/prisma/prisma.service";

describe("Auth: Login/Refresh/Logout (e2e)", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const run = Date.now();
  const password = "correcthorsebattery";
  const emails = {
    active: `e2e-login-active-${run}@example.com`,
    inactive: `e2e-login-inactive-${run}@example.com`,
    refresh: `e2e-login-refresh-${run}@example.com`,
    rateLimit: `e2e-login-ratelimit-${run}@example.com`,
  };

  const seedUser = async (email: string, status: "ACTIVE" | "INACTIVE" = "ACTIVE") => {
    const passwordHash = await bcrypt.hash(password, 4);
    return prisma.user.create({
      data: { name: "E2E Tester", email, passwordHash, status },
    });
  };

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

    await seedUser(emails.active);
    await seedUser(emails.inactive, "INACTIVE");
    await seedUser(emails.refresh);
    await seedUser(emails.rateLimit);
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { email: { in: Object.values(emails) } } });
    await app.close();
  });

  it("logs in with correct credentials and updates lastAccessAt", async () => {
    const before = await prisma.user.findUniqueOrThrow({ where: { email: emails.active } });
    expect(before.lastAccessAt).toBeNull();

    const response = await request(app.getHttpServer())
      .post("/auth/login")
      .send({ email: emails.active, password })
      .expect(200);

    expect(response.body.accessToken).toEqual(expect.any(String));
    expect(response.body.refreshToken).toEqual(expect.any(String));

    const after = await prisma.user.findUniqueOrThrow({ where: { email: emails.active } });
    expect(after.lastAccessAt).not.toBeNull();
  });

  it("rejects a wrong password with a generic 401", async () => {
    const response = await request(app.getHttpServer())
      .post("/auth/login")
      .send({ email: emails.active, password: "wrong-password" })
      .expect(401);

    expect(response.body.message).toContain("Incorrect email or password.");
  });

  it("rejects an unknown email with the same generic 401", () => {
    return request(app.getHttpServer())
      .post("/auth/login")
      .send({ email: `unknown-${run}@example.com`, password })
      .expect(401);
  });

  it("rejects an inactive account with 403", () => {
    return request(app.getHttpServer())
      .post("/auth/login")
      .send({ email: emails.inactive, password })
      .expect(403);
  });

  it("refreshes to a new token pair with a valid refresh token", async () => {
    const login = await request(app.getHttpServer())
      .post("/auth/login")
      .send({ email: emails.refresh, password })
      .expect(200);

    const response = await request(app.getHttpServer())
      .post("/auth/refresh")
      .send({ refreshToken: login.body.refreshToken })
      .expect(200);

    expect(response.body.accessToken).toEqual(expect.any(String));
    expect(response.body.accessToken).not.toBe(login.body.accessToken);
  });

  it("rejects an invalid refresh token with 401", () => {
    return request(app.getHttpServer())
      .post("/auth/refresh")
      .send({ refreshToken: "not-a-real-token" })
      .expect(401);
  });

  it("logs out with a valid access token and rejects without one", async () => {
    const login = await request(app.getHttpServer())
      .post("/auth/login")
      .send({ email: emails.refresh, password })
      .expect(200);

    await request(app.getHttpServer())
      .post("/auth/logout")
      .set("Authorization", `Bearer ${login.body.accessToken}`)
      .expect(204);

    await request(app.getHttpServer()).post("/auth/logout").expect(401);
  });

  it("rate-limits repeated login attempts for the same email", async () => {
    for (let i = 0; i < 10; i++) {
      await request(app.getHttpServer())
        .post("/auth/login")
        .send({ email: emails.rateLimit, password: "wrong-password" })
        .expect(401);
    }

    await request(app.getHttpServer())
      .post("/auth/login")
      .send({ email: emails.rateLimit, password: "wrong-password" })
      .expect(429);
  });
});
