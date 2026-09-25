import { FUEL_TYPES } from "@mony/shared-types";
import { INestApplication, ValidationPipe } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import sharp from "sharp";
import request from "supertest";

import { AppModule } from "../src/app.module";
import { AllExceptionsFilter } from "../src/common/filters/all-exceptions.filter";
import { MemoryStorageService } from "../src/common/storage/memory-storage.service";
import { StorageService } from "../src/common/storage/storage.service";
import { PrismaService } from "../src/prisma/prisma.service";

// NODE_ENV=test → StorageModule provides the in-memory store, so these
// run without MinIO; the objects map is inspected directly.
// Real, decodable images — the API re-encodes every upload, so bare magic
// bytes aren't enough anymore (WEBP_HEADER below is used only where a
// decode failure is the point).
let JPEG: Buffer;
let PNG: Buffer;
let WEBP: Buffer;
const WEBP_HEADER = Buffer.concat([
  Buffer.from("RIFF"),
  Buffer.from([0x24, 0x00, 0x00, 0x00]),
  Buffer.from("WEBPVP8 "),
]);

describe("Vehicles (e2e)", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let storage: MemoryStorageService;
  let tokenA: string;
  let tokenB: string;
  let tokenC: string;
  const stamp = Date.now();
  const emailA = `e2e-vehicles-a-${stamp}@example.com`;
  const emailB = `e2e-vehicles-b-${stamp}@example.com`;
  // C: create-validation/listing cases, kept apart from A's lifecycle list.
  const emailC = `e2e-vehicles-c-${stamp}@example.com`;
  const password = "correcthorsebattery";

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

  beforeAll(async () => {
    const solid = () =>
      sharp({
        create: { width: 40, height: 30, channels: 3, background: { r: 200, g: 40, b: 40 } },
      });
    JPEG = await solid().jpeg().toBuffer();
    PNG = await solid().png().toBuffer();
    WEBP = await solid().webp().toBuffer();

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
    tokenC = await register(emailC);
  });

  afterAll(async () => {
    // Vehicles cascade with the user.
    await prisma.user.deleteMany({ where: { email: { in: [emailA, emailB, emailC] } } });
    await app.close();
  });

  const base = {
    make: "Jeep",
    model: "Renegade",
    manufactureYear: 2021,
    modelYear: 2022,
    currentMileage: 35000,
  };

  it("rejects unauthenticated requests with 401 on every route", async () => {
    const server = app.getHttpServer();
    const id = "00000000-0000-4000-8000-000000000000";
    await request(server).get("/vehicles").expect(401);
    await request(server).get(`/vehicles/${id}`).expect(401);
    await request(server).post("/vehicles").send(base).expect(401);
    await request(server).patch(`/vehicles/${id}`).send({ currentMileage: 1 }).expect(401);
    await request(server).delete(`/vehicles/${id}`).expect(401);
    await request(server).put(`/vehicles/${id}/photo`).attach("photo", JPEG, "car.jpg").expect(401);
    await request(server).delete(`/vehicles/${id}/photo`).expect(401);
  });

  describe("create validation and listing", () => {
    const create = (body: Record<string, unknown>) =>
      request(app.getHttpServer()).post("/vehicles").set(as(tokenC)).send(body);

    it("accepts the required fields alone, with every optional null", async () => {
      const response = await create(base).expect(201);
      expect(response.body).toMatchObject({
        licensePlate: null,
        acquisitionDate: null,
        color: null,
        fuelType: null,
        photoUrl: null,
      });
    });

    it("rejects missing/blank required fields and out-of-range values with 400", async () => {
      const nextYear = new Date().getUTCFullYear() + 1;
      const invalid: Record<string, unknown>[] = [
        { ...base, make: undefined },
        { ...base, make: "   " },
        { ...base, make: "x".repeat(101) },
        { ...base, model: undefined },
        { ...base, model: "x".repeat(101) },
        { ...base, manufactureYear: undefined },
        { ...base, modelYear: undefined },
        { ...base, manufactureYear: nextYear + 1, modelYear: nextYear + 1 },
        { ...base, modelYear: nextYear + 1 },
        { ...base, currentMileage: undefined },
        { ...base, currentMileage: -1 },
        { ...base, currentMileage: 10.5 },
        { ...base, licensePlate: "x".repeat(11) },
        { ...base, color: "x".repeat(51) },
        { ...base, acquisitionDate: "2022-02-30" },
      ];
      for (const body of invalid) {
        const response = await create(body);
        // Body in the assertion so a failure names the offending payload.
        expect({ body, status: response.status }).toEqual({ body, status: 400 });
      }
    });

    it("rejects a model year before the manufacture year on create", async () => {
      const response = await create({ ...base, manufactureYear: 2022, modelYear: 2021 }).expect(
        400,
      );
      expect(response.body.message).toEqual(["modelYear cannot be earlier than manufactureYear."]);
    });

    it("accepts the year bounds, mileage 0, and any plate, even a repeated one", async () => {
      const nextYear = new Date().getUTCFullYear() + 1;
      await create({ ...base, manufactureYear: 1901, modelYear: 1901, currentMileage: 0 }).expect(
        201,
      );
      await create({ ...base, manufactureYear: nextYear, modelYear: nextYear }).expect(201);
      // No format or uniqueness check (legacy).
      const first = await create({ ...base, licensePlate: "a-b 12#/xy" }).expect(201);
      const second = await create({ ...base, licensePlate: "a-b 12#/xy" }).expect(201);
      expect(first.body.licensePlate).toBe("a-b 12#/xy");
      expect(second.body.id).not.toBe(first.body.id);
    });

    it("stores every fuel type from the legacy list", async () => {
      const created = await create(base).expect(201);
      for (const fuelType of FUEL_TYPES) {
        const response = await request(app.getHttpServer())
          .patch(`/vehicles/${created.body.id}`)
          .set(as(tokenC))
          .send({ fuelType })
          .expect(200);
        expect(response.body.fuelType).toBe(fuelType);
      }
    });

    it("lists the user's vehicles newest first, each with its display name", async () => {
      const older = await create({ ...base, make: "Honda", model: "Biz", modelYear: 2021 }).expect(
        201,
      );
      await new Promise((resolve) => setTimeout(resolve, 10));
      const newer = await create({ ...base, make: "Fiat", model: "Uno", modelYear: 2022 }).expect(
        201,
      );

      const list = await request(app.getHttpServer()).get("/vehicles").set(as(tokenC)).expect(200);
      const ids: string[] = list.body.map((vehicle: { id: string }) => vehicle.id);
      expect(ids[0]).toBe(newer.body.id);
      expect(ids.indexOf(newer.body.id)).toBeLessThan(ids.indexOf(older.body.id));
      const createdAts: string[] = list.body.map(
        (vehicle: { createdAt: string }) => vehicle.createdAt,
      );
      expect(createdAts).toEqual([...createdAts].sort().reverse());
      expect(list.body[0].displayName).toBe("Fiat Uno 2022");
      expect(list.body[ids.indexOf(older.body.id)].displayName).toBe("Honda Biz 2021");
    });
  });

  describe("lifecycle", () => {
    let vehicleId: string;

    it("creates a vehicle (blank optionals stored as null) and lists it", async () => {
      const created = await request(app.getHttpServer())
        .post("/vehicles")
        .set(as(tokenA))
        .send({
          ...base,
          licensePlate: "  ",
          color: "Prata",
          fuelType: "FLEX",
          acquisitionDate: "2022-03-15",
        })
        .expect(201);
      vehicleId = created.body.id;
      expect(created.body).toMatchObject({
        displayName: "Jeep Renegade 2022",
        licensePlate: null,
        color: "Prata",
        fuelType: "FLEX",
        acquisitionDate: "2022-03-15",
        currentMileage: 35000,
        photoUrl: null,
      });
      expect(created.body).not.toHaveProperty("photoKey");

      const list = await request(app.getHttpServer()).get("/vehicles").set(as(tokenA)).expect(200);
      expect(list.body.map((vehicle: { id: string }) => vehicle.id)).toEqual([vehicleId]);
    });

    it("raises the mileage but never lowers it (legacy message)", async () => {
      const raised = await request(app.getHttpServer())
        .patch(`/vehicles/${vehicleId}`)
        .set(as(tokenA))
        .send({ currentMileage: 36200 })
        .expect(200);
      expect(raised.body.currentMileage).toBe(36200);

      await request(app.getHttpServer())
        .patch(`/vehicles/${vehicleId}`)
        .set(as(tokenA))
        .send({ currentMileage: 36200 })
        .expect(200);

      const lowered = await request(app.getHttpServer())
        .patch(`/vehicles/${vehicleId}`)
        .set(as(tokenA))
        .send({ currentMileage: 30000 })
        .expect(400);
      expect(lowered.body.message).toEqual([
        "New mileage cannot be lower than the current value (36200 km).",
      ]);
    });

    it("validates years (range, order against merged values) and nulls", async () => {
      await request(app.getHttpServer())
        .patch(`/vehicles/${vehicleId}`)
        .set(as(tokenA))
        .send({ manufactureYear: 2023 })
        .expect(400);
      await request(app.getHttpServer())
        .post("/vehicles")
        .set(as(tokenA))
        .send({ ...base, manufactureYear: 1900 })
        .expect(400);
      await request(app.getHttpServer())
        .post("/vehicles")
        .set(as(tokenA))
        .send({ ...base, fuelType: "gasolina" })
        .expect(400);
      await request(app.getHttpServer())
        .patch(`/vehicles/${vehicleId}`)
        .set(as(tokenA))
        .send({ currentMileage: null })
        .expect(400);

      const cleared = await request(app.getHttpServer())
        .patch(`/vehicles/${vehicleId}`)
        .set(as(tokenA))
        .send({ color: null, fuelType: null })
        .expect(200);
      expect(cleared.body).toMatchObject({ color: null, fuelType: null });
    });

    it("uploads a photo (type by content), returning a signed URL, never the key", async () => {
      const response = await request(app.getHttpServer())
        .put(`/vehicles/${vehicleId}/photo`)
        // Misleading name/type on purpose: detection ignores both.
        .attach("photo", PNG, { filename: "car.jpg", contentType: "image/jpeg" })
        .set(as(tokenA))
        .expect(200);

      const keys = [...storage.objects.keys()].filter((key) => key.includes(vehicleId));
      expect(keys).toHaveLength(1);
      // Stored re-encoded as JPEG, whatever came in.
      expect(keys[0]).toMatch(/\.jpg$/);
      expect(storage.objects.get(keys[0]!)?.contentType).toBe("image/jpeg");
      expect(response.body.photoUrl).toBe(`memory://${keys[0]}?ttl=3600`);
    });

    it("replaces the photo, deleting the old object", async () => {
      const before = [...storage.objects.keys()].filter((key) => key.includes(vehicleId));

      await request(app.getHttpServer())
        .put(`/vehicles/${vehicleId}/photo`)
        .attach("photo", JPEG, "car.jpg")
        .set(as(tokenA))
        .expect(200);

      const after = [...storage.objects.keys()].filter((key) => key.includes(vehicleId));
      expect(after).toHaveLength(1);
      expect(after[0]).not.toBe(before[0]);
      expect(after[0]).toMatch(/\.jpg$/);
    });

    it("accepts a real WebP, and treats exactly 5 MB as within the limit", async () => {
      await request(app.getHttpServer())
        .put(`/vehicles/${vehicleId}/photo`)
        .attach("photo", WEBP, { filename: "car.bin", contentType: "application/octet-stream" })
        .set(as(tokenA))
        .expect(200);
      const keys = [...storage.objects.keys()].filter((key) => key.includes(vehicleId));
      expect(keys).toHaveLength(1);
      expect(keys[0]).toMatch(/\.jpg$/);

      // Exactly 5 MB gets past the size limit (then fails decoding: 400,
      // not 413); one byte more is 413.
      const exactly5Mb = Buffer.concat([
        WEBP_HEADER,
        Buffer.alloc(5 * 1024 * 1024 - WEBP_HEADER.length),
      ]);
      await request(app.getHttpServer())
        .put(`/vehicles/${vehicleId}/photo`)
        .attach("photo", exactly5Mb, "car.webp")
        .set(as(tokenA))
        .expect(400);
      await request(app.getHttpServer())
        .put(`/vehicles/${vehicleId}/photo`)
        .attach("photo", Buffer.concat([exactly5Mb, Buffer.alloc(1)]), "car.webp")
        .set(as(tokenA))
        .expect(413);
    });

    it("rejects any form field besides the one photo", async () => {
      await request(app.getHttpServer())
        .put(`/vehicles/${vehicleId}/photo`)
        .field("note", "x".repeat(1000))
        .attach("photo", JPEG, "car.jpg")
        .set(as(tokenA))
        .expect(400);
    });

    it("mints the signed URL on every vehicle response (get, list, update), never the key", async () => {
      const [key] = [...storage.objects.keys()].filter((k) => k.includes(vehicleId));
      const signed = `memory://${key}?ttl=3600`;

      const one = await request(app.getHttpServer())
        .get(`/vehicles/${vehicleId}`)
        .set(as(tokenA))
        .expect(200);
      const list = await request(app.getHttpServer()).get("/vehicles").set(as(tokenA)).expect(200);
      const patched = await request(app.getHttpServer())
        .patch(`/vehicles/${vehicleId}`)
        .set(as(tokenA))
        .send({ color: "Preto" })
        .expect(200);

      for (const body of [one.body, list.body[0], patched.body]) {
        expect(body.photoUrl).toBe(signed);
        expect(body).not.toHaveProperty("photoKey");
      }
    });

    it("rejects non-images, missing files, and files over 5 MB", async () => {
      await request(app.getHttpServer())
        .put(`/vehicles/${vehicleId}/photo`)
        .attach("photo", Buffer.from("<svg xmlns='http://www.w3.org/2000/svg'/>"), {
          filename: "evil.png",
          contentType: "image/png",
        })
        .set(as(tokenA))
        .expect(400);
      await request(app.getHttpServer())
        .put(`/vehicles/${vehicleId}/photo`)
        .set(as(tokenA))
        .expect(400);
      await request(app.getHttpServer())
        .put(`/vehicles/${vehicleId}/photo`)
        .attach("photo", Buffer.concat([JPEG, Buffer.alloc(5 * 1024 * 1024)]), "big.jpg")
        .set(as(tokenA))
        .expect(413);
    });

    it("keeps vehicles and photos private to their owner", async () => {
      await request(app.getHttpServer()).get(`/vehicles/${vehicleId}`).set(as(tokenB)).expect(404);
      await request(app.getHttpServer())
        .patch(`/vehicles/${vehicleId}`)
        .set(as(tokenB))
        .send({ currentMileage: 99999 })
        .expect(404);
      await request(app.getHttpServer())
        .put(`/vehicles/${vehicleId}/photo`)
        .attach("photo", JPEG, "car.jpg")
        .set(as(tokenB))
        .expect(404);
      await request(app.getHttpServer())
        .delete(`/vehicles/${vehicleId}/photo`)
        .set(as(tokenB))
        .expect(404);
      await request(app.getHttpServer())
        .delete(`/vehicles/${vehicleId}`)
        .set(as(tokenB))
        .expect(404);
      await request(app.getHttpServer()).get("/vehicles").set(as(tokenB)).expect(200).expect([]);

      // None of B's attempts touched A's vehicle or its photo.
      const owned = await request(app.getHttpServer())
        .get(`/vehicles/${vehicleId}`)
        .set(as(tokenA))
        .expect(200);
      expect(owned.body.currentMileage).toBe(36200);
      expect(owned.body.photoUrl).not.toBeNull();
      expect([...storage.objects.keys()].filter((key) => key.includes(vehicleId))).toHaveLength(1);
      // A malformed id is just another unknown id, not a 500.
      await request(app.getHttpServer()).get("/vehicles/not-a-uuid").set(as(tokenA)).expect(404);
    });

    it("removes the photo", async () => {
      const response = await request(app.getHttpServer())
        .delete(`/vehicles/${vehicleId}/photo`)
        .set(as(tokenA))
        .expect(200);
      expect(response.body.photoUrl).toBeNull();
      expect([...storage.objects.keys()].some((key) => key.includes(vehicleId))).toBe(false);
    });

    it("deletes the vehicle together with its photo", async () => {
      await request(app.getHttpServer())
        .put(`/vehicles/${vehicleId}/photo`)
        .attach("photo", JPEG, "car.jpg")
        .set(as(tokenA))
        .expect(200);

      await request(app.getHttpServer())
        .delete(`/vehicles/${vehicleId}`)
        .set(as(tokenA))
        .expect(204);
      await request(app.getHttpServer()).get(`/vehicles/${vehicleId}`).set(as(tokenA)).expect(404);
      expect([...storage.objects.keys()].some((key) => key.includes(vehicleId))).toBe(false);
    });
  });
});
