import { INestApplication, ValidationPipe } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import request from "supertest";

import { AppModule } from "../src/app.module";
import { ChangelogService } from "../src/changelog/changelog.service";
import { AllExceptionsFilter } from "../src/common/filters/all-exceptions.filter";
import {
  addDaysToDateString,
  parseDateOnly,
  todayDateOnlyString,
} from "../src/common/utils/date.util";
import { PrismaService } from "../src/prisma/prisma.service";

describe("Changelog (e2e)", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let service: ChangelogService;
  let adminToken: string;
  let userToken: string;
  let otherToken: string;
  let userId: string;
  const stamp = Date.now();
  const adminEmail = `e2e-changelog-admin-${stamp}@example.com`;
  const userEmail = `e2e-changelog-user-${stamp}@example.com`;
  const otherEmail = `e2e-changelog-other-${stamp}@example.com`;
  const password = "correcthorsebattery";
  const today = todayDateOnlyString();
  const createdIds: string[] = [];

  const http = () => request(app.getHttpServer());
  const as = (token: string) => ({ Authorization: `Bearer ${token}` });
  const register = async (email: string) =>
    (
      await http()
        .post("/auth/register")
        .send({ name: "Equipe Mony", email, password, passwordConfirmation: password })
        .expect(201)
    ).body.accessToken as string;
  const login = async (email: string) =>
    (await http().post("/auth/login").send({ email, password }).expect(200)).body;
  const publish = async (body: Record<string, unknown>) => {
    const response = await http().post("/admin/changelog").set(as(adminToken)).send(body);
    if (response.status === 201) createdIds.push(response.body.id);
    return response;
  };
  // The newest unread entry and how many are waiting.
  const unread = async (token = userToken) =>
    (await http().get("/changelog/unread").set(as(token)).expect(200)).body as {
      entry: { id: string; title: string; readAt: string | null } | null;
      total: number;
    };
  const historyOf = async (token = userToken) =>
    (await http().get("/changelog").set(as(token)).expect(200)).body.entries as Array<{
      id: string;
      title: string;
      publishedAt: string;
      readAt: string | null;
    }>;

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
    service = app.get(ChangelogService);

    await register(adminEmail);
    await prisma.user.update({ where: { email: adminEmail }, data: { role: "ADMIN" } });
    // A fresh login carries the admin role.
    adminToken = (await login(adminEmail)).accessToken;
    userToken = await register(userEmail);
    otherToken = await register(otherEmail);
    userId = (await prisma.user.findUniqueOrThrow({ where: { email: userEmail } })).id;
  });

  afterAll(async () => {
    await prisma.changelogEntry.deleteMany({ where: { id: { in: createdIds } } });
    await prisma.user.deleteMany({ where: { email: { in: [adminEmail, userEmail, otherEmail] } } });
    await app.close();
  });

  it("tells the app who's an admin at login", async () => {
    expect((await login(adminEmail)).user.role).toBe("ADMIN");
    expect((await login(userEmail)).user.role).toBe("USER");
  });

  it("requires a login, and admin endpoints require an admin", async () => {
    await http().get("/changelog/unread").expect(401);
    await http().get("/admin/changelog").expect(401);
    await http().get("/admin/changelog").set(as(userToken)).expect(403);
    await http()
      .post("/admin/changelog")
      .set(as(userToken))
      .send({ title: "x", description: "y" })
      .expect(403);
  });

  it("publishes now, active, keeping only the YouTube video id", async () => {
    const { body } = await publish({
      title: "  Relatórios chegaram  ",
      description: "Resumo do período,\ncategorias e evolução.",
      videoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=10s",
      expiresAt: addDaysToDateString(today, 30),
    }).then((response) => {
      expect(response.status).toBe(201);
      return response;
    });
    expect(body).toMatchObject({
      title: "Relatórios chegaram",
      description: "Resumo do período,\ncategorias e evolução.",
      videoId: "dQw4w9WgXcQ",
      expiresAt: addDaysToDateString(today, 30),
      status: "ACTIVE",
      readCount: 0,
      authorName: "Equipe Mony",
    });
    expect(Date.parse(body.publishedAt)).toBeGreaterThan(Date.now() - 60_000);
  });

  it("rejects bad input", async () => {
    for (const body of [
      { title: "", description: "texto" },
      { title: "   ", description: "texto" },
      { title: "x".repeat(151), description: "texto" },
      { title: "Título", description: "" },
      { title: "Título", description: "texto", videoUrl: "https://vimeo.com/123" },
      {
        title: "Título",
        description: "texto",
        videoUrl: "https://youtube.com.evil.test/watch?v=dQw4w9WgXcQ",
      },
      { title: "Título", description: "texto", expiresAt: "2026-02-30" },
      { title: "Título", description: "texto", expiresAt: "31/12/2026" },
      { title: "Título", description: "texto", status: "INACTIVE" },
    ]) {
      await publish(body).then((response) => expect(response.status).toBe(400));
    }
  });

  it("shows a user only what's visible to them, newest first", async () => {
    // Before the user signed up: hidden (legacy's rule).
    const old = await prisma.changelogEntry.create({
      data: { title: "Antiga", description: "x", publishedAt: new Date(2020, 0, 1) },
    });
    createdIds.push(old.id);
    const expired = await publish({
      title: "Vencida",
      description: "x",
      expiresAt: addDaysToDateString(today, -1),
    });
    const lastDay = await publish({ title: "Último dia", description: "x", expiresAt: today });
    const inactive = await publish({ title: "Inativa", description: "x" });
    await http()
      .patch(`/admin/changelog/${inactive.body.id}`)
      .set(as(adminToken))
      .send({ status: "INACTIVE" })
      .expect(200);

    // Only "Último dia" and "Relatórios chegaram" are visible and unread;
    // the newest of them comes first.
    const { entry, total } = await unread();
    expect(entry).toMatchObject({ title: "Último dia", readAt: null });
    expect(total).toBe(2);

    // The history has the same visibility.
    const titles = (await historyOf()).map((item) => item.title);
    expect(titles).toEqual(["Último dia", "Relatórios chegaram"]);
    expect(expired.status).toBe(201);
    expect(lastDay.status).toBe(201);
  });

  it("marks read once, idempotently, for this user only", async () => {
    const { entry: newest, total } = await unread();
    await http().post(`/changelog/${newest!.id}/read`).set(as(userToken)).expect(204);
    await http().post(`/changelog/${newest!.id}/read`).set(as(userToken)).expect(204);
    expect(await prisma.changelogRead.count({ where: { entryId: newest!.id } })).toBe(1);

    // The next one takes its place.
    const next = await unread();
    expect(next.entry?.id).not.toBe(newest!.id);
    expect(next.entry?.title).toBe("Relatórios chegaram");
    expect(next.total).toBe(total - 1);
    // Someone else still has it unread.
    expect((await unread(otherToken)).entry?.id).toBe(newest!.id);

    const history = await historyOf();
    expect(history.find((item) => item.id === newest!.id)?.readAt).not.toBeNull();
    expect(history.every((item) => item.title !== "Antiga")).toBe(true);

    const admin = (await http().get("/admin/changelog").set(as(adminToken)).expect(200)).body;
    expect(admin.find((item: { id: string }) => item.id === newest!.id).readCount).toBe(1);
  });

  it("answers no entry and zero once everything's read", async () => {
    const { entry } = await unread();
    await http().post(`/changelog/${entry!.id}/read`).set(as(userToken)).expect(204);
    expect(await unread()).toEqual({ entry: null, total: 0 });
  });

  it("can't mark read what the user can't see", async () => {
    const hidden = (await http().get("/admin/changelog").set(as(adminToken)).expect(200)).body.find(
      (entry: { title: string }) => entry.title === "Inativa",
    );
    await http().post(`/changelog/${hidden.id}/read`).set(as(userToken)).expect(404);
    await http()
      .post("/changelog/00000000-0000-4000-8000-000000000000/read")
      .set(as(userToken))
      .expect(404);
    await http().post("/changelog/not-a-uuid/read").set(as(userToken)).expect(400);
  });

  it("edits without moving the publication date, and clears video and expiry", async () => {
    const created = await publish({
      title: "Com vídeo",
      description: "x",
      videoUrl: "https://youtu.be/dQw4w9WgXcQ",
      expiresAt: addDaysToDateString(today, 10),
    });
    const { body } = await http()
      .patch(`/admin/changelog/${created.body.id}`)
      .set(as(adminToken))
      .send({ title: "Sem vídeo", videoUrl: null, expiresAt: null })
      .expect(200);
    expect(body).toMatchObject({ title: "Sem vídeo", videoId: null, expiresAt: null });
    expect(body.publishedAt).toBe(created.body.publishedAt);
    await http()
      .patch("/admin/changelog/00000000-0000-4000-8000-000000000000")
      .set(as(adminToken))
      .send({ title: "x" })
      .expect(404);
  });

  it("deletes an entry with its reads", async () => {
    const created = await publish({ title: "Apagar", description: "x" });
    await http().post(`/changelog/${created.body.id}/read`).set(as(userToken)).expect(204);
    await http().delete(`/admin/changelog/${created.body.id}`).set(as(adminToken)).expect(204);
    await http().delete(`/admin/changelog/${created.body.id}`).set(as(adminToken)).expect(404);
    expect(await prisma.changelogRead.count({ where: { entryId: created.body.id } })).toBe(0);
  });

  it("deactivates expired entries in the daily job, keeping the last day", async () => {
    const expired = await prisma.changelogEntry.findFirstOrThrow({
      where: { id: { in: createdIds }, title: "Vencida" },
    });
    const lastDay = await prisma.changelogEntry.findFirstOrThrow({
      where: { id: { in: createdIds }, title: "Último dia" },
    });
    expect(await service.expireOld(today)).toBeGreaterThanOrEqual(1);
    expect(
      (await prisma.changelogEntry.findUniqueOrThrow({ where: { id: expired.id } })).status,
    ).toBe("INACTIVE");
    expect(
      (await prisma.changelogEntry.findUniqueOrThrow({ where: { id: lastDay.id } })).status,
    ).toBe("ACTIVE");
    // Tomorrow, the last day is over too.
    await service.expireOld(addDaysToDateString(today, 1));
    expect(
      (await prisma.changelogEntry.findUniqueOrThrow({ where: { id: lastDay.id } })).status,
    ).toBe("INACTIVE");
    expect(parseDateOnly(today)).toBeInstanceOf(Date);
  });

  it("stops a demoted admin even with a still-valid token", async () => {
    await prisma.user.update({ where: { email: adminEmail }, data: { role: "USER" } });
    await http().get("/admin/changelog").set(as(adminToken)).expect(403);
    await prisma.user.update({ where: { email: adminEmail }, data: { role: "ADMIN" } });
    expect(userId).toBeTruthy();
  });

  it("stops a suspended admin even with a still-valid token", async () => {
    await prisma.user.update({ where: { email: adminEmail }, data: { status: "INACTIVE" } });
    try {
      await http().get("/admin/changelog").set(as(adminToken)).expect(403);
      await http()
        .post("/admin/changelog")
        .set(as(adminToken))
        .send({ title: "x", description: "y" })
        .expect(403);
    } finally {
      await prisma.user.update({ where: { email: adminEmail }, data: { status: "ACTIVE" } });
    }
    await http().get("/admin/changelog").set(as(adminToken)).expect(200);
  });

  it("guards every endpoint: 401 without a login, 403 on every admin one for a user", async () => {
    const created = await publish({ title: "Protegida", description: "x" });
    const id = created.body.id as string;

    await http().get("/changelog").expect(401);
    await http().post(`/changelog/${id}/read`).expect(401);
    await http().patch(`/admin/changelog/${id}`).send({ title: "y" }).expect(401);
    await http().delete(`/admin/changelog/${id}`).expect(401);

    await http()
      .patch(`/admin/changelog/${id}`)
      .set(as(userToken))
      .send({ title: "y" })
      .expect(403);
    await http().delete(`/admin/changelog/${id}`).set(as(userToken)).expect(403);
    // Nothing changed.
    const stored = await prisma.changelogEntry.findUniqueOrThrow({ where: { id } });
    expect(stored.title).toBe("Protegida");
  });

  it("lists everything for an admin: any status, expired or not, newest first", async () => {
    const expired = await publish({
      title: "Vencida (admin)",
      description: "x",
      expiresAt: addDaysToDateString(today, -3),
    });
    const inactive = await publish({ title: "Inativa (admin)", description: "x" });
    await http()
      .patch(`/admin/changelog/${inactive.body.id}`)
      .set(as(adminToken))
      .send({ status: "INACTIVE" })
      .expect(200);

    const list = (await http().get("/admin/changelog").set(as(adminToken)).expect(200))
      .body as Array<{
      id: string;
      title: string;
      publishedAt: string;
      expiresAt: string | null;
      status: string;
      readCount: number;
      authorName: string | null;
    }>;
    expect(list.find((entry) => entry.id === expired.body.id)).toMatchObject({
      status: "ACTIVE",
      expiresAt: addDaysToDateString(today, -3),
      readCount: 0,
      authorName: "Equipe Mony",
    });
    expect(list.find((entry) => entry.id === inactive.body.id)).toMatchObject({
      status: "INACTIVE",
      expiresAt: null,
    });
    // Seeded before anyone signed up: still listed for the admin.
    expect(list.some((entry) => entry.title === "Antiga")).toBe(true);
    const times = list.map((entry) => Date.parse(entry.publishedAt));
    expect(times).toEqual([...times].sort((a, b) => b - a));
  });

  it("keeps an expired entry hidden even before the daily job runs", async () => {
    const before = await unread();
    // ACTIVE but past its last day: the job hasn't deactivated it.
    const expired = await publish({
      title: "Vencida sem job",
      description: "x",
      expiresAt: addDaysToDateString(today, -1),
    });
    expect(
      (await prisma.changelogEntry.findUniqueOrThrow({ where: { id: expired.body.id } })).status,
    ).toBe("ACTIVE");

    // Newest of all, yet neither shown nor counted.
    const after = await unread();
    expect(after.entry?.id).not.toBe(expired.body.id);
    expect(after.total).toBe(before.total);
    expect((await historyOf()).map((item) => item.id)).not.toContain(expired.body.id);
    await http().post(`/changelog/${expired.body.id}/read`).set(as(userToken)).expect(404);
  });

  it("can't mark read an entry published before the user signed up", async () => {
    const old = await prisma.changelogEntry.findFirstOrThrow({
      where: { id: { in: createdIds }, title: "Antiga" },
    });
    expect(old.status).toBe("ACTIVE");
    await http().post(`/changelog/${old.id}/read`).set(as(userToken)).expect(404);
    expect(await prisma.changelogRead.count({ where: { entryId: old.id } })).toBe(0);
  });

  it("shows the history newest first, unread ones without a read date", async () => {
    const fresh = await publish({ title: "Ainda não lida", description: "x" });
    const before = await historyOf();

    expect(before[0]).toMatchObject({ id: fresh.body.id, readAt: null });
    const titles = before.map((item) => item.title);
    for (const hidden of ["Antiga", "Vencida", "Inativa", "Inativa (admin)", "Vencida (admin)"]) {
      expect(titles).not.toContain(hidden);
    }
    const times = before.map((item) => Date.parse(item.publishedAt));
    expect(times).toEqual([...times].sort((a, b) => b - a));

    const startedAt = Date.now();
    await http().post(`/changelog/${fresh.body.id}/read`).set(as(userToken)).expect(204);
    const readAt = (await historyOf()).find((item) => item.id === fresh.body.id)?.readAt;
    expect(Date.parse(readAt!)).toBeGreaterThanOrEqual(startedAt - 60_000);

    // Marking it again keeps the first read time.
    await http().post(`/changelog/${fresh.body.id}/read`).set(as(userToken)).expect(204);
    expect((await historyOf()).find((item) => item.id === fresh.body.id)?.readAt).toBe(readAt);
  });

  it("edits the text, the video and the status, and validates edits", async () => {
    const created = await publish({ title: "Editar tudo", description: "Antes" });
    const id = created.body.id as string;

    const { body } = await http()
      .patch(`/admin/changelog/${id}`)
      .set(as(adminToken))
      .send({
        description: "  Depois\ncom quebra  ",
        videoUrl: "https://www.youtube.com/shorts/dQw4w9WgXcQ",
        expiresAt: addDaysToDateString(today, 5),
        status: "INACTIVE",
      })
      .expect(200);
    expect(body).toMatchObject({
      title: "Editar tudo",
      description: "Depois\ncom quebra",
      videoId: "dQw4w9WgXcQ",
      expiresAt: addDaysToDateString(today, 5),
      status: "INACTIVE",
      publishedAt: created.body.publishedAt,
    });

    for (const bad of [
      { title: "   " },
      { description: "" },
      // Only the video and the expiry can be cleared with null.
      { title: null },
      { description: null },
      { status: null },
      { videoUrl: "https://vimeo.com/123" },
      { videoUrl: "" },
      { expiresAt: "2026-13-01" },
      { status: "ARCHIVED" },
      // The publication date can't be moved.
      { publishedAt: "2020-01-01T00:00:00.000Z" },
    ]) {
      const response = await http().patch(`/admin/changelog/${id}`).set(as(adminToken)).send(bad);
      expect({ bad, status: response.status }).toEqual({ bad, status: 400 });
    }
    await http().patch("/admin/changelog/not-a-uuid").set(as(adminToken)).send({}).expect(400);
    await http().delete("/admin/changelog/not-a-uuid").set(as(adminToken)).expect(400);

    const stored = await prisma.changelogEntry.findUniqueOrThrow({ where: { id } });
    expect(stored.publishedAt.toISOString()).toBe(created.body.publishedAt);
    expect(stored.title).toBe("Editar tudo");
    expect(stored.description).toBe("Depois\ncom quebra");
    expect(stored.status).toBe("INACTIVE");
  });

  it("removes a deleted entry for users too", async () => {
    const before = await unread(otherToken);
    const created = await publish({ title: "Some para todos", description: "x" });
    const id = created.body.id as string;
    expect(await unread(otherToken)).toMatchObject({
      entry: { id },
      total: before.total + 1,
    });

    await http().delete(`/admin/changelog/${id}`).set(as(adminToken)).expect(204);

    const after = await unread(otherToken);
    expect(after.entry?.id).not.toBe(id);
    expect(after.total).toBe(before.total);
    expect((await historyOf(otherToken)).map((item) => item.id)).not.toContain(id);
    await http().post(`/changelog/${id}/read`).set(as(otherToken)).expect(404);
  });

  it("survives a double tap: concurrent reads all answer 204 and record one", async () => {
    const created = await publish({ title: "Toque duplo", description: "x" });
    const id = created.body.id as string;

    const responses = await Promise.all(
      Array.from({ length: 4 }, () => http().post(`/changelog/${id}/read`).set(as(otherToken))),
    );

    expect(responses.map((response) => response.status)).toEqual([204, 204, 204, 204]);
    expect(await prisma.changelogRead.count({ where: { entryId: id } })).toBe(1);
  });
});
