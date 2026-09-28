import type { Prisma } from "@prisma/client";

// Writes to `MaintenanceAlert` shared by the vehicle-maintenance feature
// and `VehiclesService.create` — in `common/` like `debt-sync`, so neither
// feature imports the other. Always called inside the caller's
// transaction.

// One alert per type the user has, due at `currentMileage + kmInterval`
// (legacy `configurarAlertasPadrao`, applied to the user's own types).
export async function createAlertsForVehicle(
  tx: Prisma.TransactionClient,
  vehicle: { id: string; userId: string; currentMileage: number },
): Promise<void> {
  const types = await tx.maintenanceType.findMany({
    where: { userId: vehicle.userId },
    select: { id: true, kmInterval: true },
  });
  if (types.length === 0) return;
  await tx.maintenanceAlert.createMany({
    data: types.map((type) => ({
      vehicleId: vehicle.id,
      maintenanceTypeId: type.id,
      mileageAlert: vehicle.currentMileage + type.kmInterval,
    })),
    skipDuplicates: true,
  });
}

// Re-derives one alert from the type's latest record on the vehicle
// (highest mileage, then latest date) — or, with none left, from the
// vehicle's current mileage (legacy `atualizarAlertas`). Used after a
// record is added or deleted, so an older service logged after the fact
// never moves the alert backwards (legacy bug) and deleting a record never
// leaves the alert pointing at it. `currentMileage` is the vehicle's
// mileage as the caller's transaction sees it (after any raise).
export async function syncAlert(
  tx: Prisma.TransactionClient,
  vehicle: { id: string; currentMileage: number },
  type: { id: string; kmInterval: number },
): Promise<void> {
  const latest = await tx.vehicleMaintenance.findFirst({
    where: { vehicleId: vehicle.id, maintenanceTypeId: type.id },
    orderBy: [{ mileage: "desc" }, { date: "desc" }],
    select: { mileage: true },
  });
  const mileageAlert = (latest?.mileage ?? vehicle.currentMileage) + type.kmInterval;
  await tx.maintenanceAlert.upsert({
    where: {
      vehicleId_maintenanceTypeId: { vehicleId: vehicle.id, maintenanceTypeId: type.id },
    },
    create: { vehicleId: vehicle.id, maintenanceTypeId: type.id, mileageAlert },
    update: { mileageAlert },
  });
}

// Serializes writes to one vehicle's maintenance data (and checks
// ownership): concurrent record adds/deletes of the same type would
// otherwise each re-derive the alert from a snapshot missing the other's
// row, and the last commit could leave a stale value. FOR NO KEY UPDATE —
// the lock the transaction's own mileage update takes anyway — so it
// doesn't also block other transactions' foreign-key checks on the
// vehicle (e.g. a new type fanning its alerts out).
export async function lockOwnedVehicle(
  tx: Prisma.TransactionClient,
  userId: string,
  vehicleId: string,
): Promise<{ id: string; currentMileage: number } | null> {
  const rows = await tx.$queryRaw<Array<{ id: string; currentMileage: number }>>`
    SELECT "id", "currentMileage" FROM "Vehicle"
    WHERE "id" = ${vehicleId} AND "userId" = ${userId}
    FOR NO KEY UPDATE`;
  return rows[0] ?? null;
}
