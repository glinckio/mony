import { BadRequestException, ConflictException, NotFoundException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import sharp from "sharp";

import { MemoryStorageService } from "../common/storage/memory-storage.service";
import { StorageService } from "../common/storage/storage.service";
import { PrismaService } from "../prisma/prisma.service";

import { VehiclesService } from "./vehicles.service";

// Real, decodable images (the service re-encodes every upload).
let JPEG: Buffer;
let PNG: Buffer;
let BIG_WITH_EXIF: Buffer;

beforeAll(async () => {
  const solid = (width: number, height: number) =>
    sharp({ create: { width, height, channels: 3, background: { r: 30, g: 90, b: 200 } } });
  JPEG = await solid(40, 30).jpeg().toBuffer();
  PNG = await solid(40, 30).png().toBuffer();
  BIG_WITH_EXIF = await solid(3200, 2400)
    .jpeg()
    .withExif({ IFD0: { Copyright: "leak-me", Artist: "someone" } })
    .toBuffer();
});

describe("VehiclesService", () => {
  let service: VehiclesService;
  let storage: MemoryStorageService;
  let prisma: {
    vehicle: {
      findMany: jest.Mock;
      findFirst: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      updateMany: jest.Mock;
      deleteMany: jest.Mock;
    };
    maintenanceType: { findMany: jest.Mock };
    maintenanceAlert: { createMany: jest.Mock };
    $transaction: jest.Mock;
  };

  const buildVehicle = (overrides: Partial<Record<string, unknown>> = {}) => ({
    id: "veh-1",
    userId: "user-1",
    make: "Jeep",
    model: "Renegade",
    manufactureYear: 2021,
    modelYear: 2022,
    currentMileage: 35000,
    licensePlate: null,
    acquisitionDate: null,
    color: null,
    fuelType: null,
    photoKey: null as string | null,
    createdAt: new Date("2026-09-25T12:00:00.000Z"),
    updatedAt: new Date("2026-09-25T12:00:00.000Z"),
    ...overrides,
  });

  beforeEach(async () => {
    storage = new MemoryStorageService();
    prisma = {
      vehicle: {
        findMany: jest.fn().mockResolvedValue([]),
        findFirst: jest.fn().mockResolvedValue(buildVehicle()),
        create: jest.fn().mockImplementation(({ data }) => buildVehicle(data)),
        update: jest.fn().mockImplementation(({ data }) => buildVehicle(data)),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        deleteMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      maintenanceType: { findMany: jest.fn().mockResolvedValue([]) },
      maintenanceAlert: { createMany: jest.fn().mockResolvedValue({ count: 0 }) },
      // Interactive transactions run against the same mock.
      $transaction: jest.fn(),
    };
    prisma.$transaction.mockImplementation((run: (tx: typeof prisma) => unknown) => run(prisma));

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VehiclesService,
        { provide: PrismaService, useValue: prisma },
        { provide: StorageService, useValue: storage },
      ],
    }).compile();

    service = module.get(VehiclesService);
  });

  const createDto = {
    make: "Jeep",
    model: "Renegade",
    manufactureYear: 2021,
    modelYear: 2022,
    currentMileage: 35000,
  };

  describe("list", () => {
    it("lists only the user's vehicles, newest first (id tiebreak), each with a display name and a signed URL", async () => {
      prisma.vehicle.findMany.mockResolvedValue([
        buildVehicle({
          id: "veh-2",
          make: "Honda",
          model: "Biz",
          modelYear: 2019,
          photoKey: "p.jpg",
        }),
        buildVehicle(),
      ]);

      const vehicles = await service.list("user-1");

      expect(prisma.vehicle.findMany).toHaveBeenCalledWith({
        where: { userId: "user-1" },
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      });
      expect(vehicles.map((vehicle) => vehicle.displayName)).toEqual([
        "Honda Biz 2019",
        "Jeep Renegade 2022",
      ]);
      expect(vehicles[0]!.photoUrl).toBe("memory://p.jpg?ttl=3600");
      expect(vehicles[1]!.photoUrl).toBeNull();
      expect(vehicles[0]).not.toHaveProperty("photoKey");
    });
  });

  describe("findOne", () => {
    it("returns the user's vehicle with a signed photo URL, never the key", async () => {
      prisma.vehicle.findFirst.mockResolvedValue(buildVehicle({ photoKey: "k.jpg" }));

      const vehicle = await service.findOne("user-1", "veh-1");

      expect(prisma.vehicle.findFirst).toHaveBeenCalledWith({
        where: { id: "veh-1", userId: "user-1" },
      });
      expect(vehicle.photoUrl).toBe("memory://k.jpg?ttl=3600");
      expect(vehicle).not.toHaveProperty("photoKey");
      expect(vehicle).not.toHaveProperty("userId");
    });

    it("404s another user's (or a missing) vehicle", async () => {
      prisma.vehicle.findFirst.mockResolvedValue(null);

      await expect(service.findOne("user-1", "veh-x")).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe("create", () => {
    it("stores blank optional text as null and returns the legacy display name", async () => {
      const vehicle = await service.create("user-1", { ...createDto, licensePlate: "", color: "" });

      expect(prisma.vehicle.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ userId: "user-1", licensePlate: null, color: null }),
      });
      expect(vehicle.displayName).toBe("Jeep Renegade 2022");
      expect(vehicle.photoUrl).toBeNull();
    });

    it("creates an alert per maintenance type the user has, due at mileage + interval", async () => {
      prisma.maintenanceType.findMany.mockResolvedValue([
        { id: "type-oil", kmInterval: 10000 },
        { id: "type-tires", kmInterval: 8000 },
      ]);

      await service.create("user-1", createDto);

      expect(prisma.maintenanceType.findMany).toHaveBeenCalledWith({
        where: { userId: "user-1" },
        select: { id: true, kmInterval: true },
      });
      expect(prisma.maintenanceAlert.createMany).toHaveBeenCalledWith({
        data: [
          { vehicleId: "veh-1", maintenanceTypeId: "type-oil", mileageAlert: 45000 },
          { vehicleId: "veh-1", maintenanceTypeId: "type-tires", mileageAlert: 43000 },
        ],
        skipDuplicates: true,
      });
    });

    it("creates no alerts when the user has no maintenance types", async () => {
      await service.create("user-1", createDto);

      expect(prisma.maintenanceAlert.createMany).not.toHaveBeenCalled();
    });

    it("rejects a model year before the manufacture year, or a year after next year", async () => {
      await expect(
        service.create("user-1", { ...createDto, modelYear: 2020 }),
      ).rejects.toBeInstanceOf(BadRequestException);
      const tooLate = new Date().getUTCFullYear() + 2;
      await expect(
        service.create("user-1", { ...createDto, manufactureYear: tooLate, modelYear: tooLate }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(prisma.vehicle.create).not.toHaveBeenCalled();
    });
  });

  describe("update", () => {
    it("rejects a lower mileage with the legacy message", async () => {
      await expect(service.update("user-1", "veh-1", { currentMileage: 34999 })).rejects.toThrow(
        "New mileage cannot be lower than the current value (35000 km).",
      );
      expect(prisma.vehicle.updateMany).not.toHaveBeenCalled();
    });

    it("accepts a higher (or equal) mileage, guarding the floor in the WHERE too", async () => {
      await service.update("user-1", "veh-1", { currentMileage: 36000 });

      expect(prisma.vehicle.updateMany).toHaveBeenCalledWith({
        where: { id: "veh-1", userId: "user-1", currentMileage: { lte: 36000 } },
        data: expect.objectContaining({ currentMileage: 36000 }),
      });
    });

    it("rejects when a concurrent update raised the mileage past the new value", async () => {
      prisma.vehicle.updateMany.mockResolvedValue({ count: 0 });
      prisma.vehicle.findFirst
        .mockResolvedValueOnce(buildVehicle())
        .mockResolvedValueOnce(buildVehicle({ currentMileage: 40000 }));

      await expect(service.update("user-1", "veh-1", { currentMileage: 36000 })).rejects.toThrow(
        "(40000 km)",
      );
    });

    it("checks year order against the merged values", async () => {
      await expect(
        service.update("user-1", "veh-1", { manufactureYear: 2023 }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it("rejects a lowered model year below the stored manufacture year, or a year after next year", async () => {
      await expect(service.update("user-1", "veh-1", { modelYear: 2020 })).rejects.toThrow(
        "modelYear cannot be earlier than manufactureYear.",
      );
      const tooLate = new Date().getUTCFullYear() + 2;
      await expect(
        service.update("user-1", "veh-1", { modelYear: tooLate }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(prisma.vehicle.updateMany).not.toHaveBeenCalled();
    });

    it("clears nullable fields with null", async () => {
      await service.update("user-1", "veh-1", { color: null, acquisitionDate: null });

      expect(prisma.vehicle.updateMany.mock.calls[0][0].data).toMatchObject({
        color: null,
        acquisitionDate: null,
      });
    });

    it("404s another user's vehicle", async () => {
      prisma.vehicle.findFirst.mockResolvedValue(null);

      await expect(service.update("user-1", "veh-x", { make: "X" })).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe("photos", () => {
    // Stateful row so the compare-and-swap and the final re-read behave
    // like the database would.
    let row: ReturnType<typeof buildVehicle> | null;
    beforeEach(() => {
      row = buildVehicle();
      prisma.vehicle.findFirst.mockImplementation(async () => row);
      prisma.vehicle.updateMany.mockImplementation(
        async ({ where, data }: { where: { photoKey?: string | null }; data: object }) => {
          if (!row || ("photoKey" in where && where.photoKey !== row.photoKey)) {
            return { count: 0 };
          }
          row = { ...row, ...data };
          return { count: 1 };
        },
      );
    });

    it("re-encodes the upload as a metadata-free JPEG capped at 1600 px, under a fresh per-vehicle key", async () => {
      const vehicle = await service.setPhoto("user-1", "veh-1", {
        buffer: BIG_WITH_EXIF,
        size: BIG_WITH_EXIF.length,
      });

      const [key] = [...storage.objects.keys()];
      expect(key).toMatch(/^vehicles\/user-1\/veh-1\/[0-9a-f-]{36}\.jpg$/);
      const stored = storage.objects.get(key!)!;
      expect(stored.contentType).toBe("image/jpeg");
      const metadata = await sharp(stored.body).metadata();
      expect(metadata.format).toBe("jpeg");
      expect(Math.max(metadata.width!, metadata.height!)).toBe(1600);
      expect(metadata.exif).toBeUndefined();
      expect(stored.body.includes(Buffer.from("leak-me"))).toBe(false);
      expect(prisma.vehicle.updateMany).toHaveBeenCalledWith({
        where: { id: "veh-1", userId: "user-1", photoKey: null },
        data: { photoKey: key },
      });
      expect(vehicle.photoUrl).toBe(`memory://${key}?ttl=3600`);
    });

    it("stores a PNG as JPEG too (one output format)", async () => {
      await service.setPhoto("user-1", "veh-1", { buffer: PNG, size: PNG.length });

      const [key] = [...storage.objects.keys()];
      expect(key).toMatch(/\.jpg$/);
    });

    it("deletes the previous photo when replacing it", async () => {
      await storage.put("vehicles/user-1/veh-1/old.jpg", JPEG, "image/jpeg");
      row = buildVehicle({ photoKey: "vehicles/user-1/veh-1/old.jpg" });

      await service.setPhoto("user-1", "veh-1", { buffer: JPEG, size: JPEG.length });

      expect(storage.objects.has("vehicles/user-1/veh-1/old.jpg")).toBe(false);
      expect(storage.objects.size).toBe(1);
    });

    it("rejects a missing file, a non-image and an oversized file before touching the DB", async () => {
      await expect(service.setPhoto("user-1", "veh-1", undefined)).rejects.toBeInstanceOf(
        BadRequestException,
      );
      const svg = Buffer.from("<svg xmlns='http://www.w3.org/2000/svg'/>");
      await expect(
        service.setPhoto("user-1", "veh-1", { buffer: svg, size: svg.length }),
      ).rejects.toThrow("Photo must be a JPEG, PNG, or WebP image.");
      await expect(
        service.setPhoto("user-1", "veh-1", { buffer: JPEG, size: 6 * 1024 * 1024 }),
      ).rejects.toThrow("Photo must be at most 5 MB.");
      expect(prisma.vehicle.findFirst).not.toHaveBeenCalled();
      expect(storage.objects.size).toBe(0);
    });

    it("rejects right-magic-bytes garbage (polyglot/corrupt) as undecodable", async () => {
      const fake = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.from("<script>")]);

      await expect(
        service.setPhoto("user-1", "veh-1", { buffer: fake, size: fake.length }),
      ).rejects.toThrow("Photo couldn't be read as an image.");
      expect(storage.objects.size).toBe(0);
    });

    it("removes the uploaded object if saving the key fails", async () => {
      prisma.vehicle.updateMany.mockRejectedValue(new Error("db down"));

      await expect(
        service.setPhoto("user-1", "veh-1", { buffer: JPEG, size: JPEG.length }),
      ).rejects.toThrow("db down");
      expect(storage.objects.size).toBe(0);
    });

    it("loses a concurrent photo change cleanly: 409, its own upload removed, the winner's kept", async () => {
      // Another request swaps the photo between our read and our write.
      prisma.vehicle.updateMany.mockImplementationOnce(async () => {
        row = buildVehicle({ photoKey: "vehicles/user-1/veh-1/winner.jpg" });
        return { count: 0 };
      });
      await storage.put("vehicles/user-1/veh-1/winner.jpg", JPEG, "image/jpeg");

      await expect(
        service.setPhoto("user-1", "veh-1", { buffer: JPEG, size: JPEG.length }),
      ).rejects.toBeInstanceOf(ConflictException);
      expect([...storage.objects.keys()]).toEqual(["vehicles/user-1/veh-1/winner.jpg"]);
    });

    it("keeps the new photo when deleting the replaced one fails (best-effort cleanup)", async () => {
      row = buildVehicle({ photoKey: "old.jpg" });
      jest.spyOn(storage, "delete").mockRejectedValue(new Error("minio down"));

      const vehicle = await service.setPhoto("user-1", "veh-1", {
        buffer: JPEG,
        size: JPEG.length,
      });

      const [key] = [...storage.objects.keys()];
      expect(vehicle.photoUrl).toBe(`memory://${key}?ttl=3600`);
      expect(storage.delete).toHaveBeenCalledWith("old.jpg");
    });

    it("404s a photo upload to another user's vehicle without storing anything", async () => {
      row = null;

      await expect(
        service.setPhoto("user-1", "veh-x", { buffer: JPEG, size: JPEG.length }),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(storage.objects.size).toBe(0);
      expect(prisma.vehicle.updateMany).not.toHaveBeenCalled();
    });

    it("removes the photo from storage and the vehicle", async () => {
      await storage.put("k.jpg", JPEG, "image/jpeg");
      row = buildVehicle({ photoKey: "k.jpg" });

      const vehicle = await service.removePhoto("user-1", "veh-1");

      expect(prisma.vehicle.updateMany).toHaveBeenCalledWith({
        where: { id: "veh-1", userId: "user-1", photoKey: "k.jpg" },
        data: { photoKey: null },
      });
      expect(vehicle.photoUrl).toBeNull();
      expect(storage.objects.size).toBe(0);
    });

    it("404s removing another user's photo, leaving storage alone", async () => {
      await storage.put("k.jpg", JPEG, "image/jpeg");
      row = null;

      await expect(service.removePhoto("user-1", "veh-x")).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(storage.objects.has("k.jpg")).toBe(true);
      expect(prisma.vehicle.updateMany).not.toHaveBeenCalled();
    });
  });

  describe("delete", () => {
    it("deletes the row, then sweeps everything under the vehicle's storage prefix", async () => {
      await storage.put("vehicles/user-1/veh-1/current.jpg", JPEG, "image/jpeg");
      await storage.put("vehicles/user-1/veh-1/orphan.jpg", JPEG, "image/jpeg");
      await storage.put("vehicles/user-1/veh-10/other.jpg", JPEG, "image/jpeg");

      await service.delete("user-1", "veh-1");

      expect(prisma.vehicle.deleteMany).toHaveBeenCalledWith({
        where: { id: "veh-1", userId: "user-1" },
      });
      // Only veh-1's prefix ("veh-1/", so not "veh-10/").
      expect([...storage.objects.keys()]).toEqual(["vehicles/user-1/veh-10/other.jpg"]);
    });

    it("still succeeds when the storage sweep fails", async () => {
      jest.spyOn(storage, "deletePrefix").mockRejectedValue(new Error("minio down"));

      await expect(service.delete("user-1", "veh-1")).resolves.toBeUndefined();
    });

    it("404s another user's (or an already deleted) vehicle without touching storage", async () => {
      prisma.vehicle.deleteMany.mockResolvedValue({ count: 0 });
      await storage.put("vehicles/user-1/veh-x/k.jpg", JPEG, "image/jpeg");

      await expect(service.delete("user-1", "veh-x")).rejects.toBeInstanceOf(NotFoundException);
      expect(storage.objects.size).toBe(1);
    });
  });
});
