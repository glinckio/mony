import { INestApplication, Logger, ValidationPipe } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import sharp from "sharp";
import request from "supertest";

import { AppModule } from "../src/app.module";
import { AllExceptionsFilter } from "../src/common/filters/all-exceptions.filter";
import { MemoryStorageService } from "../src/common/storage/memory-storage.service";
import { StorageService } from "../src/common/storage/storage.service";
import {
  addDaysToDateString,
  addMonthsToDateString,
  todayDateOnlyString,
} from "../src/common/utils/date.util";
import { PrismaService } from "../src/prisma/prisma.service";

// NODE_ENV=test → in-memory storage; its objects map is inspected directly.
const PDF = Buffer.from("%PDF-1.4\n1 0 obj << /Type /Catalog >> endobj\ntrailer << >>\n%%EOF\n");

describe("Vehicle maintenance (e2e)", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let storage: MemoryStorageService;
  let JPEG: Buffer;
  let tokenA: string;
  let tokenB: string;
  const stamp = Date.now();
  const emailA = `e2e-maint-a-${stamp}@example.com`;
  const emailB = `e2e-maint-b-${stamp}@example.com`;
  const password = "correcthorsebattery";
  const today = todayDateOnlyString();

  const register = async (email: string): Promise<string> => {
    const response = await request(app.getHttpServer()).post("/auth/register").send({
      name: "E2E Tester",
      email,
      password,
      passwordConfirmation: password,
    });
    return response.body.accessToken;
  };
  const as = (token: string) => ({ Authorization: `Bearer ${token}` });
  const http = () => request(app.getHttpServer());

  const createVehicle = async (token: string, currentMileage: number): Promise<string> => {
    const response = await http()
      .post("/vehicles")
      .set(as(token))
      .send({ make: "Fiat", model: "Argo", manufactureYear: 2021, modelYear: 2022, currentMileage })
      .expect(201);
    return response.body.id;
  };
  const createType = async (
    token: string,
    body: Record<string, unknown>,
  ): Promise<{ id: string }> =>
    (await http().post("/maintenance-types").set(as(token)).send(body).expect(201)).body;
  const alerts = async (token: string, vehicleId: string) =>
    (await http().get(`/vehicles/${vehicleId}/maintenance-alerts`).set(as(token)).expect(200))
      .body as Array<Record<string, unknown>>;
  const alertFor = async (token: string, vehicleId: string, typeId: string) =>
    (await alerts(token, vehicleId)).find((alert) => alert.maintenanceTypeId === typeId)!;
  const mileageOf = async (token: string, vehicleId: string): Promise<number> =>
    (await http().get(`/vehicles/${vehicleId}`).set(as(token)).expect(200)).body.currentMileage;

  beforeAll(async () => {
    JPEG = await sharp({
      create: { width: 40, height: 30, channels: 3, background: { r: 30, g: 90, b: 200 } },
    })
      .jpeg()
      .toBuffer();

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
    storage = app.get(StorageService);
    expect(storage).toBeInstanceOf(MemoryStorageService);
    tokenA = await register(emailA);
    tokenB = await register(emailB);
  });

  afterAll(async () => {
    // Types, vehicles, alerts and records all cascade with the user.
    await prisma.user.deleteMany({ where: { email: { in: [emailA, emailB] } } });
    await app.close();
  });

  it("rejects unauthenticated requests with 401", async () => {
    await http().get("/maintenance-types").expect(401);
    await http().post("/maintenance-types").send({}).expect(401);
    await http().delete("/maintenance-types/x").expect(401);
    await http().get("/vehicles/x/maintenance-alerts").expect(401);
    await http().get("/vehicles/x/maintenance-records").expect(401);
    await http().post("/vehicles/x/maintenance-records").send({}).expect(401);
    await http().delete("/vehicles/x/maintenance-records/y").expect(401);
    await http().put("/vehicles/x/maintenance-records/y/receipt").expect(401);
  });

  describe("types", () => {
    it("validates the input", async () => {
      for (const body of [
        {},
        { name: "  ", kmInterval: 10000 },
        { name: "Óleo", kmInterval: 0 },
        { name: "Óleo", kmInterval: 10000, monthsInterval: 121 },
        { name: "Óleo", kmInterval: 10000, system: "Motor" },
        { name: "Óleo", kmInterval: 10000, isDefault: true },
      ]) {
        await http().post("/maintenance-types").set(as(tokenB)).send(body).expect(400);
      }
    });

    it("lists only the user's own types, by system (none last), then name", async () => {
      await createType(tokenB, { name: "Revisão geral", kmInterval: 20000 });
      await createType(tokenB, { name: "Pastilhas", kmInterval: 30000, system: "BRAKES" });
      await createType(tokenB, {
        name: "Óleo",
        kmInterval: 10000,
        monthsInterval: 12,
        system: "ENGINE",
        description: "  ",
      });

      const list = (await http().get("/maintenance-types").set(as(tokenB)).expect(200)).body;
      expect(list.map((type: { name: string }) => type.name)).toEqual([
        "Óleo",
        "Pastilhas",
        "Revisão geral",
      ]);
      expect(list[0]).toMatchObject({
        system: "ENGINE",
        kmInterval: 10000,
        monthsInterval: 12,
        description: null,
      });
      expect((await http().get("/maintenance-types").set(as(tokenA)).expect(200)).body).toEqual([]);
    });
  });

  describe("lifecycle", () => {
    let vehicleId: string;
    let oilId: string;
    let newestRecordId: string;

    it("gives a new vehicle an alert per existing type, OVERDUE until first serviced", async () => {
      oilId = (
        await createType(tokenA, {
          name: "Troca de óleo",
          kmInterval: 10000,
          monthsInterval: 12,
          system: "LUBRICATION",
        })
      ).id;
      vehicleId = await createVehicle(tokenA, 35000);

      const [oil] = await alerts(tokenA, vehicleId);
      expect(oil).toEqual({
        maintenanceTypeId: oilId,
        name: "Troca de óleo",
        system: "LUBRICATION",
        kmInterval: 10000,
        monthsInterval: 12,
        status: "OVERDUE",
        percent: 100,
        nextMileage: 45000,
        kmRemaining: 10000,
        nextDate: null,
        daysRemaining: null,
        lastService: null,
      });
    });

    it("registers a maintenance: raises the mileage and moves the alert", async () => {
      const response = await http()
        .post(`/vehicles/${vehicleId}/maintenance-records`)
        .set(as(tokenA))
        .send({
          maintenanceTypeId: oilId,
          mileage: 40000,
          date: today,
          cost: 289.9,
          location: " Auto Center ",
          notes: "",
        })
        .expect(201);
      newestRecordId = response.body.id;
      expect(response.body).toMatchObject({
        vehicleId,
        maintenanceTypeId: oilId,
        type: { name: "Troca de óleo", system: "LUBRICATION" },
        mileage: 40000,
        date: today,
        cost: "289.90",
        location: "Auto Center",
        notes: null,
        receipt: null,
      });

      expect(await mileageOf(tokenA, vehicleId)).toBe(40000);
      expect(await alertFor(tokenA, vehicleId, oilId)).toMatchObject({
        status: "ON_TRACK",
        percent: 0,
        nextMileage: 50000,
        kmRemaining: 10000,
        nextDate: addMonthsToDateString(today, 12),
        lastService: { date: today, mileage: 40000 },
      });
    });

    it("keeps an older service logged late as history: mileage and alert don't go back", async () => {
      const older = await http()
        .post(`/vehicles/${vehicleId}/maintenance-records`)
        .set(as(tokenA))
        .send({ maintenanceTypeId: oilId, mileage: 30000, date: addDaysToDateString(today, -200) })
        .expect(201);

      expect(await mileageOf(tokenA, vehicleId)).toBe(40000);
      expect(await alertFor(tokenA, vehicleId, oilId)).toMatchObject({ nextMileage: 50000 });

      const records = (
        await http().get(`/vehicles/${vehicleId}/maintenance-records`).set(as(tokenA)).expect(200)
      ).body;
      // Newest date first.
      expect(records.map((record: { id: string }) => record.id)).toEqual([
        newestRecordId,
        older.body.id,
      ]);
    });

    it("escalates on time: a service due within 15 days is URGENT even far from the km", async () => {
      const type = await createType(tokenA, {
        name: "Fluido de freio",
        kmInterval: 20000,
        monthsInterval: 1,
      });
      await http()
        .post(`/vehicles/${vehicleId}/maintenance-records`)
        .set(as(tokenA))
        .send({ maintenanceTypeId: type.id, mileage: 40000, date: addDaysToDateString(today, -20) })
        .expect(201);

      const alert = await alertFor(tokenA, vehicleId, type.id);
      expect(alert.status).toBe("URGENT");
      expect(alert.percent).toBe(90);
      expect(alert.daysRemaining as number).toBeLessThanOrEqual(15);
    });

    it("rejects future dates, other users' types and bad input", async () => {
      const post = (body: Record<string, unknown>) =>
        http().post(`/vehicles/${vehicleId}/maintenance-records`).set(as(tokenA)).send(body);
      await post({
        maintenanceTypeId: oilId,
        mileage: 41000,
        date: addDaysToDateString(today, 1),
      }).expect(400);
      const foreign = (await http().get("/maintenance-types").set(as(tokenB)).expect(200)).body[0];
      await post({ maintenanceTypeId: foreign.id, mileage: 41000, date: today }).expect(400);
      await post({ maintenanceTypeId: oilId, mileage: 0, date: today }).expect(400);
      await post({ maintenanceTypeId: oilId, mileage: 41000, date: "2026-02-31" }).expect(400);
      await post({ maintenanceTypeId: oilId, mileage: 41000, date: today, cost: 1.234 }).expect(
        400,
      );
      await post({ maintenanceTypeId: oilId, mileage: 41000, date: today, cost: -1 }).expect(400);
    });

    it("attaches an image receipt (re-encoded) and replaces it with a PDF", async () => {
      const first = await http()
        .put(`/vehicles/${vehicleId}/maintenance-records/${newestRecordId}/receipt`)
        .attach("receipt", JPEG, { filename: "nota.pdf", contentType: "application/pdf" })
        .set(as(tokenA))
        .expect(200);
      const prefix = `vehicles/`;
      const keysAfterImage = [...storage.objects.keys()].filter(
        (key) => key.startsWith(prefix) && key.includes(`/maintenance/${newestRecordId}/`),
      );
      expect(keysAfterImage).toHaveLength(1);
      expect(keysAfterImage[0]).toMatch(new RegExp(`^vehicles/[^/]+/${vehicleId}/maintenance/`));
      expect(keysAfterImage[0]).toMatch(/\.jpg$/);
      expect(first.body.receipt).toEqual({
        url: `memory://${keysAfterImage[0]}?ttl=3600`,
        kind: "IMAGE",
      });

      const second = await http()
        .put(`/vehicles/${vehicleId}/maintenance-records/${newestRecordId}/receipt`)
        .attach("receipt", PDF, "nota.pdf")
        .set(as(tokenA))
        .expect(200);
      const keysAfterPdf = [...storage.objects.keys()].filter((key) =>
        key.includes(`/maintenance/${newestRecordId}/`),
      );
      expect(keysAfterPdf).toHaveLength(1);
      expect(keysAfterPdf[0]).toMatch(/\.pdf$/);
      expect(storage.objects.get(keysAfterPdf[0]!)).toMatchObject({
        contentType: "application/pdf",
        body: PDF,
      });
      expect(second.body.receipt.kind).toBe("PDF");
    });

    it("rejects receipts that aren't an image or a complete PDF, and oversize ones", async () => {
      const put = () =>
        http()
          .put(`/vehicles/${vehicleId}/maintenance-records/${newestRecordId}/receipt`)
          .set(as(tokenA));
      await put()
        .attach("receipt", Buffer.from("<html><script>alert(1)</script></html>"), "nota.pdf")
        .expect(400);
      // Truncated PDF: header but no %%EOF.
      await put().attach("receipt", PDF.subarray(0, 30), "nota.pdf").expect(400);
      await put().expect(400);
      await put()
        .attach("receipt", Buffer.concat([PDF, Buffer.alloc(10 * 1024 * 1024)]), "big.pdf")
        .expect(413);
    });

    it("deletes the newest record: alert falls back to the remaining one, receipt removed", async () => {
      // An orphan a failed replace could have left: the record's whole
      // prefix is swept, not just the key the row points to.
      const current = [...storage.objects.keys()].find((key) =>
        key.includes(`/maintenance/${newestRecordId}/`),
      )!;
      await storage.put(current.replace(/[^/]+$/, "orphan.jpg"), JPEG, "image/jpeg");

      await http()
        .delete(`/vehicles/${vehicleId}/maintenance-records/${newestRecordId}`)
        .set(as(tokenA))
        .expect(204);

      expect(
        [...storage.objects.keys()].filter((key) =>
          key.includes(`/maintenance/${newestRecordId}/`),
        ),
      ).toEqual([]);
      // The 30,000 km service is the latest left.
      expect(await alertFor(tokenA, vehicleId, oilId)).toMatchObject({
        nextMileage: 40000,
        lastService: { mileage: 30000 },
        status: "OVERDUE",
      });
      await http()
        .delete(`/vehicles/${vehicleId}/maintenance-records/${newestRecordId}`)
        .set(as(tokenA))
        .expect(404);
    });

    it("fans a new type out to existing vehicles, at each one's mileage + interval", async () => {
      const second = await createVehicle(tokenA, 12000);
      const tires = await createType(tokenA, { name: "Rodízio", kmInterval: 8000 });

      expect(await alertFor(tokenA, vehicleId, tires.id)).toMatchObject({ nextMileage: 48000 });
      expect(await alertFor(tokenA, second, tires.id)).toMatchObject({
        nextMileage: 20000,
        status: "OVERDUE",
      });
    });

    it("refuses to delete a type with history (409), deletes one without (204)", async () => {
      await http().delete(`/maintenance-types/${oilId}`).set(as(tokenA)).expect(409);

      const unused = await createType(tokenA, { name: "Palhetas", kmInterval: 15000 });
      await http().delete(`/maintenance-types/${unused.id}`).set(as(tokenA)).expect(204);
      expect(
        (await alerts(tokenA, vehicleId)).some((alert) => alert.maintenanceTypeId === unused.id),
      ).toBe(false);
      expect(await prisma.maintenanceAlert.count({ where: { maintenanceTypeId: unused.id } })).toBe(
        0,
      );
    });

    it("keeps everything private to the owner (404)", async () => {
      await http().get(`/vehicles/${vehicleId}/maintenance-alerts`).set(as(tokenB)).expect(404);
      await http().get(`/vehicles/${vehicleId}/maintenance-records`).set(as(tokenB)).expect(404);
      const records = (
        await http().get(`/vehicles/${vehicleId}/maintenance-records`).set(as(tokenA)).expect(200)
      ).body;
      await http()
        .post(`/vehicles/${vehicleId}/maintenance-records`)
        .set(as(tokenB))
        .send({ maintenanceTypeId: oilId, mileage: 50000, date: today })
        .expect(404);
      await http()
        .delete(`/vehicles/${vehicleId}/maintenance-records/${records[0].id}`)
        .set(as(tokenB))
        .expect(404);
      await http()
        .put(`/vehicles/${vehicleId}/maintenance-records/${records[0].id}/receipt`)
        .attach("receipt", PDF, "nota.pdf")
        .set(as(tokenB))
        .expect(404);
      await http().delete(`/maintenance-types/${oilId}`).set(as(tokenB)).expect(404);
    });

    it("deletes the vehicle with its alerts, records and receipts", async () => {
      const records = (
        await http().get(`/vehicles/${vehicleId}/maintenance-records`).set(as(tokenA)).expect(200)
      ).body;
      await http()
        .put(`/vehicles/${vehicleId}/maintenance-records/${records[0].id}/receipt`)
        .attach("receipt", PDF, "nota.pdf")
        .set(as(tokenA))
        .expect(200);

      await http().delete(`/vehicles/${vehicleId}`).set(as(tokenA)).expect(204);

      expect(await prisma.maintenanceAlert.count({ where: { vehicleId } })).toBe(0);
      expect(await prisma.vehicleMaintenance.count({ where: { vehicleId } })).toBe(0);
      expect([...storage.objects.keys()].filter((key) => key.includes(vehicleId))).toEqual([]);
      // With its history gone, the type can be deleted now.
      await http().delete(`/maintenance-types/${oilId}`).set(as(tokenA)).expect(204);
    });
  });
  describe("edge cases", () => {
    let vehicleId: string;
    let typeId: string;

    const addRecord = async (mileage: number): Promise<string> =>
      (
        await http()
          .post(`/vehicles/${vehicleId}/maintenance-records`)
          .set(as(tokenA))
          .send({ maintenanceTypeId: typeId, mileage, date: today })
          .expect(201)
      ).body.id;

    beforeAll(async () => {
      typeId = (await createType(tokenA, { name: "Correia dentada", kmInterval: 50000 })).id;
      vehicleId = await createVehicle(tokenA, 60000);
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it("recreates a missing alert on the next record, and reports it meanwhile without writing", async () => {
      await prisma.maintenanceAlert.deleteMany({ where: { vehicleId, maintenanceTypeId: typeId } });

      // A GET never writes: the status is computed as if the alert existed.
      expect(await alertFor(tokenA, vehicleId, typeId)).toMatchObject({
        nextMileage: 110000,
        status: "OVERDUE",
      });
      expect(
        await prisma.maintenanceAlert.count({ where: { vehicleId, maintenanceTypeId: typeId } }),
      ).toBe(0);

      await addRecord(61000);

      const alert = await prisma.maintenanceAlert.findUnique({
        where: { vehicleId_maintenanceTypeId: { vehicleId, maintenanceTypeId: typeId } },
      });
      expect(alert?.mileageAlert).toBe(111000);
    });

    it("answers 409 and discards its upload when the receipt changed concurrently", async () => {
      const recordId = await addRecord(62000);
      const concurrentKey = `vehicles/other-request/${recordId}.pdf`;
      const put = storage.put.bind(storage);
      let uploadedKey = "";
      // Another request swaps the receipt between this one's read and its
      // compare-and-swap.
      jest.spyOn(storage, "put").mockImplementationOnce(async (key, body, contentType) => {
        uploadedKey = key;
        await put(key, body, contentType);
        await prisma.vehicleMaintenance.update({
          where: { id: recordId },
          data: { receiptKey: concurrentKey },
        });
      });

      await http()
        .put(`/vehicles/${vehicleId}/maintenance-records/${recordId}/receipt`)
        .attach("receipt", PDF, "nota.pdf")
        .set(as(tokenA))
        .expect(409);

      expect(uploadedKey).toContain(`/maintenance/${recordId}/`);
      expect(storage.objects.has(uploadedKey)).toBe(false);
      // The winner's receipt stays.
      expect(
        (await prisma.vehicleMaintenance.findUnique({ where: { id: recordId } }))?.receiptKey,
      ).toBe(concurrentKey);
    });

    it("still deletes the record (204) when the storage sweep fails, and logs it", async () => {
      const recordId = await addRecord(63000);
      jest.spyOn(storage, "deletePrefix").mockRejectedValueOnce(new Error("storage unreachable"));
      const warn = jest.spyOn(Logger.prototype, "warn").mockImplementation(() => undefined);

      await http()
        .delete(`/vehicles/${vehicleId}/maintenance-records/${recordId}`)
        .set(as(tokenA))
        .expect(204);

      expect(await prisma.vehicleMaintenance.count({ where: { id: recordId } })).toBe(0);
      expect(warn).toHaveBeenCalledWith(
        expect.stringContaining(`/maintenance/${recordId}/: Error: storage unreachable`),
      );
    });

    it("reaches a record only through its own vehicle, even for the same owner", async () => {
      const recordId = await addRecord(64000);
      await http()
        .put(`/vehicles/${vehicleId}/maintenance-records/${recordId}/receipt`)
        .attach("receipt", PDF, "nota.pdf")
        .set(as(tokenA))
        .expect(200);
      const otherVehicleId = await createVehicle(tokenA, 1000);

      await http()
        .delete(`/vehicles/${otherVehicleId}/maintenance-records/${recordId}`)
        .set(as(tokenA))
        .expect(404);
      await http()
        .put(`/vehicles/${otherVehicleId}/maintenance-records/${recordId}/receipt`)
        .attach("receipt", PDF, "nota.pdf")
        .set(as(tokenA))
        .expect(404);

      expect(await prisma.vehicleMaintenance.count({ where: { id: recordId } })).toBe(1);
      // Its receipt wasn't swept by the refused delete.
      expect(
        [...storage.objects.keys()].filter((key) => key.includes(`/maintenance/${recordId}/`)),
      ).toHaveLength(1);
    });
  });

  it("deletes a user who still has maintenance history (cascades don't depend on order)", async () => {
    const emailC = `e2e-maint-c-${stamp}@example.com`;
    const tokenC = await register(emailC);
    const type = await createType(tokenC, { name: "Troca de óleo", kmInterval: 10000 });
    const vehicleId = await createVehicle(tokenC, 20000);
    const record = await http()
      .post(`/vehicles/${vehicleId}/maintenance-records`)
      .set(as(tokenC))
      .send({ maintenanceTypeId: type.id, mileage: 21000, date: today })
      .expect(201);

    await prisma.user.delete({ where: { email: emailC } });

    expect(await prisma.maintenanceType.count({ where: { id: type.id } })).toBe(0);
    expect(await prisma.vehicleMaintenance.count({ where: { id: record.body.id } })).toBe(0);
    expect(await prisma.maintenanceAlert.count({ where: { vehicleId } })).toBe(0);
  });
});
