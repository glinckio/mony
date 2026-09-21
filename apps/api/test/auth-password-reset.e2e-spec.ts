import { INestApplication, ValidationPipe } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import * as bcrypt from "bcryptjs";
import request from "supertest";

import { AppModule } from "../src/app.module";
import { AllExceptionsFilter } from "../src/common/filters/all-exceptions.filter";
import { PrismaService } from "../src/prisma/prisma.service";

describe("Auth: Password Reset (e2e)", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const run = Date.now();
  const password = "correcthorsebattery";
  const emails = {
    main: `e2e-reset-main-${run}@example.com`,
    unknown: `e2e-reset-unknown-${run}@example.com`,
    rateLimit: `e2e-reset-ratelimit-${run}@example.com`,
  };

  const seedUser = async (email: string) => {
    const passwordHash = await bcrypt.hash(password, 4);
    return prisma.user.create({ data: { name: "E2E Tester", email, passwordHash } });
  };

  const latestCodeFor = async (userId: string) =>
    prisma.passwordResetCode.findFirstOrThrow({
      where: { userId, usedAt: null },
      orderBy: { createdAt: "desc" },
    });

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

    await seedUser(emails.main);
    await seedUser(emails.rateLimit);
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { email: { in: Object.values(emails) } } });
    await app.close();
  });

  it("request -> confirm -> login with the new password, end to end", async () => {
    const user = await prisma.user.findUniqueOrThrow({ where: { email: emails.main } });

    await request(app.getHttpServer())
      .post("/auth/password-reset/request")
      .send({ email: emails.main })
      .expect(200);

    const { code } = await latestCodeFor(user.id);

    const newPassword = "brand-new-password";
    await request(app.getHttpServer())
      .post("/auth/password-reset/confirm")
      .send({
        email: emails.main,
        code,
        newPassword,
        newPasswordConfirmation: newPassword,
      })
      .expect(200);

    await request(app.getHttpServer())
      .post("/auth/login")
      .send({ email: emails.main, password: newPassword })
      .expect(200);

    await request(app.getHttpServer())
      .post("/auth/login")
      .send({ email: emails.main, password })
      .expect(401);
  });

  it("returns the same generic 200 for an unknown email, without creating a code", async () => {
    const response = await request(app.getHttpServer())
      .post("/auth/password-reset/request")
      .send({ email: emails.unknown })
      .expect(200);

    expect(response.body.message).toEqual(expect.any(String));

    const codes = await prisma.passwordResetCode.findMany({
      where: { user: { email: emails.unknown } },
    });
    expect(codes).toHaveLength(0);
  });

  it("returns byte-for-byte the same message for a known and an unknown email, so the client can't branch on it", async () => {
    const knownResponse = await request(app.getHttpServer())
      .post("/auth/password-reset/request")
      .send({ email: emails.main })
      .expect(200);

    const unknownResponse = await request(app.getHttpServer())
      .post("/auth/password-reset/request")
      .send({ email: emails.unknown })
      .expect(200);

    expect(knownResponse.body.message).toEqual(unknownResponse.body.message);
  });

  it("rejects a code that is valid for a different user", async () => {
    const otherUser = await prisma.user.findUniqueOrThrow({ where: { email: emails.main } });

    await request(app.getHttpServer())
      .post("/auth/password-reset/request")
      .send({ email: emails.main })
      .expect(200);

    const { code } = await latestCodeFor(otherUser.id);

    await request(app.getHttpServer())
      .post("/auth/password-reset/confirm")
      .send({
        email: emails.rateLimit,
        code,
        newPassword: "someone-elses-password",
        newPasswordConfirmation: "someone-elses-password",
      })
      .expect(400);
  });

  it("rejects a wrong code with a generic 400", async () => {
    await request(app.getHttpServer())
      .post("/auth/password-reset/request")
      .send({ email: emails.main })
      .expect(200);

    const response = await request(app.getHttpServer())
      .post("/auth/password-reset/confirm")
      .send({
        email: emails.main,
        code: "000000",
        newPassword: "another-new-password",
        newPasswordConfirmation: "another-new-password",
      })
      .expect(400);

    expect(response.body.message).toContain("Invalid or expired code.");
  });

  it("rejects reusing an already-confirmed code", async () => {
    const user = await prisma.user.findUniqueOrThrow({ where: { email: emails.main } });

    await request(app.getHttpServer())
      .post("/auth/password-reset/request")
      .send({ email: emails.main })
      .expect(200);

    const { code } = await latestCodeFor(user.id);
    const newPassword = "yet-another-password";

    await request(app.getHttpServer())
      .post("/auth/password-reset/confirm")
      .send({ email: emails.main, code, newPassword, newPasswordConfirmation: newPassword })
      .expect(200);

    await request(app.getHttpServer())
      .post("/auth/password-reset/confirm")
      .send({ email: emails.main, code, newPassword, newPasswordConfirmation: newPassword })
      .expect(400);
  });

  it("rate-limits repeated reset requests for the same email", async () => {
    for (let i = 0; i < 5; i++) {
      await request(app.getHttpServer())
        .post("/auth/password-reset/request")
        .send({ email: emails.rateLimit })
        .expect(200);
    }

    await request(app.getHttpServer())
      .post("/auth/password-reset/request")
      .send({ email: emails.rateLimit })
      .expect(429);
  });
});
