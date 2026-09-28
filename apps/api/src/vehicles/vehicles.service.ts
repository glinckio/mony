import { randomUUID } from "crypto";

import { VEHICLE_PHOTO_MAX_BYTES, maxVehicleYear } from "@mony/shared-types";
import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import type { Vehicle } from "@prisma/client";

import { createAlertsForVehicle } from "../common/maintenance-alerts/alert-sync";
import { detectImageType } from "../common/storage/image-type";
import { normalizePhoto, type NormalizedPhoto } from "../common/storage/normalize-photo";
import { StorageService } from "../common/storage/storage.service";
import { parseDateOnly, toDateOnlyString } from "../common/utils/date.util";
import { PrismaService } from "../prisma/prisma.service";

import { CreateVehicleDto } from "./dto/create-vehicle.dto";
import { UpdateVehicleDto } from "./dto/update-vehicle.dto";
import { VehicleDto } from "./dto/vehicle.dto";

const PHOTO_URL_TTL_SECONDS = 60 * 60;

// Uploaded file as Multer hands it over (memory storage).
export interface UploadedPhoto {
  buffer: Buffer;
  size: number;
}

// Blank optional text is stored as null, not "".
function blankToNull(value: string | null | undefined): string | null | undefined {
  return value === "" ? null : value;
}

// Vehicle registry (legacy `funcoes_veiculos.php`). User-level, not
// workspace-scoped. Photos live in private object storage: the row keeps
// only the object key and every response mints a short-lived signed URL
// — see docs/specs/vehicles/design.md "Storage".
@Injectable()
export class VehiclesService {
  private readonly logger = new Logger(VehiclesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  async list(userId: string): Promise<VehicleDto[]> {
    const vehicles = await this.prisma.vehicle.findMany({
      where: { userId },
      // Newest first (deliberate: legacy sorted by make, model); id breaks
      // ties so the order is stable.
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    });
    return Promise.all(vehicles.map((vehicle) => this.toDto(vehicle)));
  }

  async findOne(userId: string, id: string): Promise<VehicleDto> {
    return this.toDto(await this.findOwned(userId, id));
  }

  async create(userId: string, dto: CreateVehicleDto): Promise<VehicleDto> {
    this.assertYears(dto.manufactureYear, dto.modelYear);
    // Same transaction as the alerts for the user's maintenance types, so a
    // vehicle never exists without them (docs/specs/vehicle-maintenance).
    const vehicle = await this.prisma.$transaction(async (tx) => {
      const created = await tx.vehicle.create({
        data: {
          userId,
          make: dto.make,
          model: dto.model,
          manufactureYear: dto.manufactureYear,
          modelYear: dto.modelYear,
          currentMileage: dto.currentMileage,
          licensePlate: blankToNull(dto.licensePlate),
          acquisitionDate: dto.acquisitionDate ? parseDateOnly(dto.acquisitionDate) : undefined,
          color: blankToNull(dto.color),
          fuelType: dto.fuelType,
        },
      });
      await createAlertsForVehicle(tx, created);
      return created;
    });
    return this.toDto(vehicle);
  }

  async update(userId: string, id: string, dto: UpdateVehicleDto): Promise<VehicleDto> {
    const existing = await this.findOwned(userId, id);
    this.assertYears(
      dto.manufactureYear ?? existing.manufactureYear,
      dto.modelYear ?? existing.modelYear,
    );

    if (dto.currentMileage !== undefined && dto.currentMileage < existing.currentMileage) {
      throw this.mileageDecrease(existing.currentMileage);
    }

    const data = {
      make: dto.make,
      model: dto.model,
      manufactureYear: dto.manufactureYear,
      modelYear: dto.modelYear,
      currentMileage: dto.currentMileage,
      licensePlate: blankToNull(dto.licensePlate),
      acquisitionDate:
        dto.acquisitionDate === undefined
          ? undefined
          : dto.acquisitionDate && parseDateOnly(dto.acquisitionDate),
      color: blankToNull(dto.color),
      fuelType: dto.fuelType,
    };

    // The mileage floor goes into the WHERE too, so a concurrent update
    // that raised it in between can't be undone by this (older) value.
    const { count } = await this.prisma.vehicle.updateMany({
      where: {
        id,
        userId,
        ...(dto.currentMileage !== undefined
          ? { currentMileage: { lte: dto.currentMileage } }
          : {}),
      },
      data,
    });
    if (count === 0) {
      const current = await this.findOwned(userId, id);
      throw this.mileageDecrease(current.currentMileage);
    }

    return this.findOne(userId, id);
  }

  async delete(userId: string, id: string): Promise<void> {
    const { count } = await this.prisma.vehicle.deleteMany({ where: { id, userId } });
    if (count === 0) {
      throw new NotFoundException("Vehicle not found.");
    }
    // After the row is gone, sweep the vehicle's whole storage prefix — not
    // just the key the row pointed at — so objects a failed best-effort
    // delete or a lost photo race left behind don't outlive the vehicle
    // (deleted personal data must not linger). A storage failure here must
    // not resurrect the row, so it's logged, not thrown.
    await this.deletePrefixQuietly(this.photoPrefix(userId, id));
  }

  async setPhoto(userId: string, id: string, file: UploadedPhoto | undefined): Promise<VehicleDto> {
    // Cheap checks before touching the database.
    if (!file || file.size === 0) {
      throw new BadRequestException("A photo file is required (multipart field 'photo').");
    }
    // Multer's fileSize limit normally cuts this off first (413); this is
    // the backstop if the interceptor's limits ever change.
    if (file.size > VEHICLE_PHOTO_MAX_BYTES) {
      throw new BadRequestException("Photo must be at most 5 MB.");
    }
    if (!detectImageType(file.buffer)) {
      throw new BadRequestException("Photo must be a JPEG, PNG, or WebP image.");
    }
    const vehicle = await this.findOwned(userId, id);

    // Never store the uploaded bytes as-is: re-encoding drops EXIF/GPS and
    // anything smuggled after a valid header (see normalizePhoto).
    let photo: NormalizedPhoto;
    try {
      photo = await normalizePhoto(file.buffer);
    } catch {
      throw new BadRequestException("Photo couldn't be read as an image.");
    }

    // A fresh key per upload: old signed URLs die with the old object and
    // no cache ever serves a stale image under a reused URL.
    const key = `${this.photoPrefix(userId, id)}${randomUUID()}.${photo.extension}`;
    await this.storage.put(key, photo.body, photo.contentType);

    // Compare-and-swap on the key we read: if another request changed the
    // photo in between, ours loses cleanly instead of orphaning theirs.
    const { count } = await this.prisma.vehicle
      .updateMany({ where: { id, userId, photoKey: vehicle.photoKey }, data: { photoKey: key } })
      .catch(async (error: unknown) => {
        await this.deleteObjectQuietly(key);
        throw error;
      });
    if (count === 0) {
      await this.deleteObjectQuietly(key);
      throw await this.photoConflict(userId, id);
    }
    await this.deleteObjectQuietly(vehicle.photoKey);
    return this.findOne(userId, id);
  }

  async removePhoto(userId: string, id: string): Promise<VehicleDto> {
    const vehicle = await this.findOwned(userId, id);
    const { count } = await this.prisma.vehicle.updateMany({
      where: { id, userId, photoKey: vehicle.photoKey },
      data: { photoKey: null },
    });
    if (count === 0) {
      throw await this.photoConflict(userId, id);
    }
    await this.deleteObjectQuietly(vehicle.photoKey);
    return this.findOne(userId, id);
  }

  // Lost a photo compare-and-swap: 404 if the vehicle is gone, else 409.
  private async photoConflict(userId: string, id: string): Promise<Error> {
    await this.findOwned(userId, id);
    return new ConflictException("The vehicle's photo was changed by another request. Try again.");
  }

  private photoPrefix(userId: string, vehicleId: string): string {
    return `vehicles/${userId}/${vehicleId}/`;
  }

  private assertYears(manufactureYear: number, modelYear: number): void {
    const maxYear = maxVehicleYear();
    if (manufactureYear > maxYear || modelYear > maxYear) {
      throw new BadRequestException(`Years must be at most ${maxYear}.`);
    }
    if (modelYear < manufactureYear) {
      throw new BadRequestException("modelYear cannot be earlier than manufactureYear.");
    }
  }

  // Legacy message, in English per the API language policy.
  private mileageDecrease(current: number): BadRequestException {
    return new BadRequestException(
      `New mileage cannot be lower than the current value (${current} km).`,
    );
  }

  private async deletePrefixQuietly(prefix: string): Promise<void> {
    try {
      await this.storage.deletePrefix(prefix);
    } catch (error) {
      this.logger.warn(`Couldn't delete stored objects under ${prefix}: ${String(error)}`);
    }
  }

  private async deleteObjectQuietly(key: string | null): Promise<void> {
    if (!key) return;
    try {
      await this.storage.delete(key);
    } catch (error) {
      this.logger.warn(`Couldn't delete stored object ${key}: ${String(error)}`);
    }
  }

  private async findOwned(userId: string, id: string): Promise<Vehicle> {
    const vehicle = await this.prisma.vehicle.findFirst({ where: { id, userId } });
    if (!vehicle) {
      throw new NotFoundException("Vehicle not found.");
    }
    return vehicle;
  }

  private async toDto(vehicle: Vehicle): Promise<VehicleDto> {
    return {
      id: vehicle.id,
      make: vehicle.make,
      model: vehicle.model,
      displayName: `${vehicle.make} ${vehicle.model} ${vehicle.modelYear}`,
      manufactureYear: vehicle.manufactureYear,
      modelYear: vehicle.modelYear,
      currentMileage: vehicle.currentMileage,
      licensePlate: vehicle.licensePlate,
      acquisitionDate: vehicle.acquisitionDate ? toDateOnlyString(vehicle.acquisitionDate) : null,
      color: vehicle.color,
      fuelType: vehicle.fuelType,
      photoUrl: vehicle.photoKey
        ? await this.storage.getSignedUrl(vehicle.photoKey, PHOTO_URL_TTL_SECONDS)
        : null,
      createdAt: vehicle.createdAt.toISOString(),
      updatedAt: vehicle.updatedAt.toISOString(),
    };
  }
}
