import { randomUUID } from "crypto";

import { MAINTENANCE_RECEIPT_MAX_BYTES } from "@mony/shared-types";
import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { Prisma, type MaintenanceType, type VehicleMaintenance } from "@prisma/client";

import { lockOwnedVehicle, syncAlert } from "../common/maintenance-alerts/alert-sync";
import { StorageService } from "../common/storage/storage.service";
import { parseDateOnly, toDateOnlyString, todayDateOnlyString } from "../common/utils/date.util";
import { decimalToString } from "../common/utils/money.util";
import { PrismaService } from "../prisma/prisma.service";

import { compareByUrgency, computeAlertStatus } from "./alert-status";
import { CreateMaintenanceRecordDto } from "./dto/create-maintenance-record.dto";
import { MaintenanceAlertStatusDto } from "./dto/maintenance-alert-status.dto";
import { MaintenanceRecordDto } from "./dto/maintenance-record.dto";
import { invalidReceipt, prepareReceipt, receiptKind, sniffReceipt } from "./receipt";

// Same signing window as vehicle photos (docs/specs/vehicles/design.md).
const RECEIPT_URL_TTL_SECONDS = 60 * 60;

// Uploaded file as Multer hands it over (memory storage).
export interface UploadedReceipt {
  buffer: Buffer;
  size: number;
}

type RecordWithType = VehicleMaintenance & {
  maintenanceType: Pick<MaintenanceType, "name" | "system">;
};

function blankToNull(value: string | undefined): string | null {
  return value ? value : null;
}

// A vehicle's maintenance alerts and history (legacy `funcoes_veiculos.php`
// maintenance half). Ownership always goes through the vehicle: someone
// else's vehicle or record is a 404. Receipts live in private storage
// under the vehicle's prefix, so deleting the vehicle sweeps them too.
@Injectable()
export class VehicleMaintenanceService {
  private readonly logger = new Logger(VehicleMaintenanceService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  // Every type the user has, with its live status on this vehicle — most
  // urgent first. Four queries in one round trip whatever the number of
  // types, read from one snapshot (REPEATABLE READ) so a concurrent record
  // write can't mix a new last service with the old mileage or alert.
  async listAlerts(userId: string, vehicleId: string): Promise<MaintenanceAlertStatusDto[]> {
    const [vehicle, types, alerts, latestRecords] = await this.prisma.$transaction(
      [
        this.prisma.vehicle.findFirst({
          where: { id: vehicleId, userId },
          select: { id: true, currentMileage: true },
        }),
        this.prisma.maintenanceType.findMany({
          where: { userId },
          select: { id: true, name: true, system: true, kmInterval: true, monthsInterval: true },
        }),
        this.prisma.maintenanceAlert.findMany({
          where: { vehicleId },
          select: { maintenanceTypeId: true, mileageAlert: true },
        }),
        // Latest record per type: highest mileage, then latest date (legacy
        // `ORDER BY quilometragem DESC, data_realizacao DESC`). All-descending
        // so Postgres reads it straight off the (vehicleId, type, mileage)
        // index; `distinct` then keeps the first row per type.
        this.prisma.vehicleMaintenance.findMany({
          where: { vehicleId },
          orderBy: [{ maintenanceTypeId: "desc" }, { mileage: "desc" }, { date: "desc" }],
          distinct: ["maintenanceTypeId"],
          select: { maintenanceTypeId: true, mileage: true, date: true },
        }),
      ],
      { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead },
    );
    // The other three are scoped by vehicle only; they're dropped unless
    // the vehicle is the user's.
    if (!vehicle) {
      throw new NotFoundException("Vehicle not found.");
    }

    const alertByType = new Map(alerts.map((alert) => [alert.maintenanceTypeId, alert]));
    const latestByType = new Map(latestRecords.map((record) => [record.maintenanceTypeId, record]));
    const today = todayDateOnlyString();

    return types
      .map((type) => {
        const latest = latestByType.get(type.id);
        const lastService = latest
          ? { date: toDateOnlyString(latest.date), mileage: latest.mileage }
          : null;
        // No alert row yet (a type created while this vehicle's insert was
        // in flight): report what it would be, without writing on a GET.
        const mileageAlert =
          alertByType.get(type.id)?.mileageAlert ?? vehicle.currentMileage + type.kmInterval;
        const status = computeAlertStatus(
          {
            currentMileage: vehicle.currentMileage,
            mileageAlert,
            kmInterval: type.kmInterval,
            monthsInterval: type.monthsInterval,
            lastService,
          },
          today,
        );
        return {
          maintenanceTypeId: type.id,
          name: type.name,
          system: type.system,
          kmInterval: type.kmInterval,
          monthsInterval: type.monthsInterval,
          status: status.status,
          percent: status.percent,
          nextMileage: mileageAlert,
          kmRemaining: status.kmRemaining,
          nextDate: status.nextDate,
          daysRemaining: status.daysRemaining,
          lastService,
        };
      })
      .sort((a, b) => compareByUrgency(a, b) || a.name.localeCompare(b.name, "pt-BR"));
  }

  async listRecords(userId: string, vehicleId: string): Promise<MaintenanceRecordDto[]> {
    await this.findOwnedVehicle(userId, vehicleId);
    const records = await this.prisma.vehicleMaintenance.findMany({
      where: { vehicleId },
      include: { maintenanceType: { select: { name: true, system: true } } },
      // Newest first (legacy `ORDER BY data_realizacao DESC, id DESC`).
      orderBy: [{ date: "desc" }, { createdAt: "desc" }, { id: "desc" }],
    });
    return Promise.all(records.map((record) => this.toRecordDto(record)));
  }

  // One transaction (legacy `registrarManutencao`): raise the vehicle's
  // mileage if the service's is higher (never lower it), insert the
  // record, then re-derive the type's alert from its latest record — which
  // isn't necessarily this one when an older service is logged late.
  async createRecord(
    userId: string,
    vehicleId: string,
    dto: CreateMaintenanceRecordDto,
  ): Promise<MaintenanceRecordDto> {
    if (dto.date > todayDateOnlyString()) {
      throw new BadRequestException("date cannot be in the future.");
    }
    const record = await this.prisma
      .$transaction(async (tx) => {
        const vehicle = await lockOwnedVehicle(tx, userId, vehicleId);
        if (!vehicle) {
          throw new NotFoundException("Vehicle not found.");
        }
        const type = await tx.maintenanceType.findFirst({
          where: { id: dto.maintenanceTypeId, userId },
          select: { id: true, kmInterval: true },
        });
        if (!type) {
          throw new BadRequestException("maintenanceTypeId is not one of your maintenance types.");
        }
        const currentMileage = Math.max(vehicle.currentMileage, dto.mileage);
        if (currentMileage > vehicle.currentMileage) {
          await tx.vehicle.update({ where: { id: vehicleId }, data: { currentMileage } });
        }
        const created = await tx.vehicleMaintenance.create({
          data: {
            vehicleId,
            maintenanceTypeId: type.id,
            mileage: dto.mileage,
            date: parseDateOnly(dto.date),
            cost: dto.cost,
            location: blankToNull(dto.location),
            notes: blankToNull(dto.notes),
          },
          include: { maintenanceType: { select: { name: true, system: true } } },
        });
        await syncAlert(tx, { id: vehicleId, currentMileage }, type);
        return created;
      })
      .catch((error: unknown) => {
        // The type was deleted between the check and the insert (the delete
        // holds the type row, so the insert's foreign key fails).
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2003") {
          throw new BadRequestException("maintenanceTypeId is not one of your maintenance types.");
        }
        throw error;
      });
    return this.toRecordDto(record);
  }

  // Deletes the record and re-derives the type's alert from what's left
  // (none left → current mileage + interval, legacy `atualizarAlertas`);
  // legacy didn't recalculate, leaving the alert on a deleted service.
  // Then sweeps the record's whole storage prefix — not just the key the
  // row pointed at — so a receipt a failed replace or a crash left behind
  // doesn't outlive the record (deleted personal data must not linger).
  async deleteRecord(userId: string, vehicleId: string, id: string): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const vehicle = await lockOwnedVehicle(tx, userId, vehicleId);
      if (!vehicle) {
        throw new NotFoundException("Vehicle not found.");
      }
      const record = await tx.vehicleMaintenance.findFirst({
        where: { id, vehicleId },
        select: { id: true, maintenanceType: { select: { id: true, kmInterval: true } } },
      });
      if (!record) {
        throw new NotFoundException("Maintenance record not found.");
      }
      await tx.vehicleMaintenance.delete({ where: { id } });
      await syncAlert(tx, vehicle, record.maintenanceType);
    });
    await this.deletePrefixQuietly(this.recordPrefix(userId, vehicleId, id));
  }

  async setReceipt(
    userId: string,
    vehicleId: string,
    id: string,
    file: UploadedReceipt | undefined,
  ): Promise<MaintenanceRecordDto> {
    // Cheap checks before touching the database.
    if (!file || file.size === 0) {
      throw new BadRequestException("A receipt file is required (multipart field 'receipt').");
    }
    // Multer's fileSize limit normally cuts this off first (413); this is
    // the backstop if the interceptor's limits ever change.
    if (file.size > MAINTENANCE_RECEIPT_MAX_BYTES) {
      throw new BadRequestException("Receipt must be at most 10 MB.");
    }
    if (!sniffReceipt(file.buffer)) {
      throw invalidReceipt();
    }
    const record = await this.findOwnedRecord(userId, vehicleId, id);
    // Images are decoded and re-encoded here (metadata stripped).
    const receipt = await prepareReceipt(file.buffer);

    // A fresh key per upload, under the vehicle's prefix (swept when the
    // vehicle is deleted).
    const key = `${this.recordPrefix(userId, vehicleId, id)}${randomUUID()}.${receipt.extension}`;
    await this.storage.put(key, receipt.body, receipt.contentType);

    // Compare-and-swap on the key we read, like the vehicle photo — under
    // the vehicle lock, so it can't interleave with a record delete.
    const { count } = await this.prisma
      .$transaction(async (tx) => {
        if (!(await lockOwnedVehicle(tx, userId, vehicleId))) return { count: 0 };
        return tx.vehicleMaintenance.updateMany({
          where: { id, vehicleId, receiptKey: record.receiptKey },
          data: { receiptKey: key },
        });
      })
      .catch(async (error: unknown) => {
        await this.deleteObjectQuietly(key);
        throw error;
      });
    if (count === 0) {
      await this.deleteObjectQuietly(key);
      await this.findOwnedRecord(userId, vehicleId, id);
      throw new ConflictException(
        "The record's receipt was changed by another request. Try again.",
      );
    }
    await this.deleteObjectQuietly(record.receiptKey);
    return this.toRecordDto(await this.findOwnedRecord(userId, vehicleId, id));
  }

  private async findOwnedVehicle(
    userId: string,
    vehicleId: string,
  ): Promise<{ id: string; currentMileage: number }> {
    const vehicle = await this.prisma.vehicle.findFirst({
      where: { id: vehicleId, userId },
      select: { id: true, currentMileage: true },
    });
    if (!vehicle) {
      throw new NotFoundException("Vehicle not found.");
    }
    return vehicle;
  }

  private async findOwnedRecord(
    userId: string,
    vehicleId: string,
    id: string,
  ): Promise<RecordWithType> {
    const record = await this.prisma.vehicleMaintenance.findFirst({
      where: { id, vehicleId, vehicle: { userId } },
      include: { maintenanceType: { select: { name: true, system: true } } },
    });
    if (!record) {
      throw new NotFoundException("Maintenance record not found.");
    }
    return record;
  }

  private async toRecordDto(record: RecordWithType): Promise<MaintenanceRecordDto> {
    return {
      id: record.id,
      vehicleId: record.vehicleId,
      maintenanceTypeId: record.maintenanceTypeId,
      type: { name: record.maintenanceType.name, system: record.maintenanceType.system },
      mileage: record.mileage,
      date: toDateOnlyString(record.date),
      cost: record.cost === null ? null : decimalToString(record.cost),
      location: record.location,
      notes: record.notes,
      receipt: record.receiptKey
        ? {
            url: await this.storage.getSignedUrl(record.receiptKey, RECEIPT_URL_TTL_SECONDS),
            kind: receiptKind(record.receiptKey),
          }
        : null,
      createdAt: record.createdAt.toISOString(),
    };
  }

  private recordPrefix(userId: string, vehicleId: string, recordId: string): string {
    return `vehicles/${userId}/${vehicleId}/maintenance/${recordId}/`;
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
}
