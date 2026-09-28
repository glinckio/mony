import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import type { MaintenanceType } from "@prisma/client";

import { PrismaService } from "../prisma/prisma.service";

import { CreateMaintenanceTypeDto } from "./dto/create-maintenance-type.dto";
import { MaintenanceTypeDto } from "./dto/maintenance-type.dto";

// Blank optional text is stored as null, not "".
function blankToNull(value: string | undefined): string | null {
  return value ? value : null;
}

// Maintenance types (legacy `tipos_manutencao`). Always the user's own:
// there are no system default types (owner decision — legacy's database
// had none).
@Injectable()
export class MaintenanceTypesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(userId: string): Promise<MaintenanceTypeDto[]> {
    const types = await this.prisma.maintenanceType.findMany({
      where: { userId },
      // Grouped by system in the app (legacy grouped by `sistema`); types
      // without one ("Geral") last.
      orderBy: [{ system: { sort: "asc", nulls: "last" } }, { name: "asc" }, { id: "asc" }],
    });
    return types.map((type) => this.toDto(type));
  }

  // Also creates the type's alert on every vehicle the user owns (legacy
  // `adicionarTipoManutencao`), in the same transaction.
  async create(userId: string, dto: CreateMaintenanceTypeDto): Promise<MaintenanceTypeDto> {
    const type = await this.prisma.$transaction(async (tx) => {
      const created = await tx.maintenanceType.create({
        data: {
          userId,
          name: dto.name,
          description: blankToNull(dto.description),
          system: dto.system,
          kmInterval: dto.kmInterval,
          monthsInterval: dto.monthsInterval,
        },
      });
      const vehicles = await tx.vehicle.findMany({
        where: { userId },
        select: { id: true, currentMileage: true },
      });
      if (vehicles.length > 0) {
        await tx.maintenanceAlert.createMany({
          data: vehicles.map((vehicle) => ({
            vehicleId: vehicle.id,
            maintenanceTypeId: created.id,
            mileageAlert: vehicle.currentMileage + created.kmInterval,
          })),
        });
      }
      return created;
    });
    return this.toDto(type);
  }

  // Only a type with no history: records are never deleted implicitly
  // (legacy's foreign key made this delete fail too). The DB cascades
  // type → records (so a user delete always works), so the check must be
  // airtight: the type row is locked first — an in-flight record insert
  // holds a key-share lock on it through its foreign key, so we wait for
  // it to commit and then see its row; one that starts after us waits for
  // our delete and then fails its foreign key (the API answers 400).
  // Its alerts go by cascade.
  async delete(userId: string, id: string): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const locked = await tx.$queryRaw<Array<{ id: string }>>`
        SELECT "id" FROM "MaintenanceType"
        WHERE "id" = ${id} AND "userId" = ${userId}
        FOR UPDATE`;
      if (locked.length === 0) {
        throw new NotFoundException("Maintenance type not found.");
      }
      const record = await tx.vehicleMaintenance.findFirst({
        where: { maintenanceTypeId: id },
        select: { id: true },
      });
      if (record) {
        throw new ConflictException(
          "This maintenance type has maintenance records. Delete them before deleting the type.",
        );
      }
      await tx.maintenanceType.delete({ where: { id } });
    });
  }

  private toDto(type: MaintenanceType): MaintenanceTypeDto {
    return {
      id: type.id,
      name: type.name,
      description: type.description,
      system: type.system,
      kmInterval: type.kmInterval,
      monthsInterval: type.monthsInterval,
      createdAt: type.createdAt.toISOString(),
    };
  }
}
