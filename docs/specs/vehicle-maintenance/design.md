# Design — Vehicle Maintenance

## Data model (Prisma)

```prisma
model MaintenanceType {
  id              String   @id @default(uuid())
  userId          String?  // null = system default
  user            User?    @relation(fields: [userId], references: [id], onDelete: Cascade)
  name            String   @db.VarChar(100)
  description     String?  @db.VarChar(255)
  kmInterval      Int
  monthsInterval  Int?
  isDefault       Boolean  @default(false)

  alerts       MaintenanceAlert[]
  records      VehicleMaintenance[]

  @@index([userId])
}

model MaintenanceAlert {
  id                String          @id @default(uuid())
  vehicleId         String
  vehicle           Vehicle         @relation(fields: [vehicleId], references: [id], onDelete: Cascade)
  maintenanceTypeId String
  maintenanceType   MaintenanceType @relation(fields: [maintenanceTypeId], references: [id])
  mileageAlert      Int
  active            Boolean         @default(true)

  @@unique([vehicleId, maintenanceTypeId])
}

model VehicleMaintenance {
  id                String          @id @default(uuid())
  vehicleId         String
  vehicle           Vehicle         @relation(fields: [vehicleId], references: [id], onDelete: Cascade)
  maintenanceTypeId String
  maintenanceType   MaintenanceType @relation(fields: [maintenanceTypeId], references: [id])
  mileage           Int
  date              DateTime        @db.Date
  cost              Decimal?        @db.Decimal(10, 2)
  location          String?         @db.VarChar(100)
  notes             String?         @db.VarChar(500)
  receiptUrl        String?
  createdAt         DateTime        @default(now())

  @@index([vehicleId, date])
}
```

`prisma/seed.ts` (extends the `categories` seed) adds system default
`MaintenanceType` rows (oil change, tire rotation, etc. — ported from
legacy's default set).

## API surface

| Method | Path | Auth | Request DTO | Response DTO | Error cases |
|---|---|---|---|---|---|
| GET | `/maintenance-types` | Bearer | — | `MaintenanceTypeDto[]` | 401 |
| POST | `/maintenance-types` | Bearer | `CreateMaintenanceTypeDto` | `MaintenanceTypeDto` | 400, 401 |
| DELETE | `/maintenance-types/:id` | Bearer | — | 204 | 401, 404 (not owner or system default) |
| GET | `/vehicles/:vehicleId/maintenance-alerts` | Bearer | — | `MaintenanceAlertStatusDto[]` | 401, 404 |
| GET | `/vehicles/:vehicleId/maintenance-records` | Bearer | — | `VehicleMaintenanceDto[]` | 401, 404 |
| POST | `/vehicles/:vehicleId/maintenance-records` | Bearer | `CreateMaintenanceRecordDto` | `VehicleMaintenanceDto` | 400, 401, 404 |
| DELETE | `/vehicles/:vehicleId/maintenance-records/:id` | Bearer | — | 204 | 401, 404 |

`MaintenanceAlertStatusDto` (computed, not the raw `MaintenanceAlert`
row):
```ts
{
  maintenanceTypeId: string; maintenanceTypeName: string;
  status: "ON_TRACK" | "WARNING" | "URGENT" | "OVERDUE";
  percent: number; // 0-100
  kmRemaining: number | null;
  daysRemaining: number | null;
}
```

Status computation lives in `MaintenanceAlertsService.computeStatus()` —
pure function, unit-tested directly against the threshold table in
requirements.md without needing a live DB.

## Mobile screens

| Screen | Route | Reads | Writes | Notes |
|---|---|---|---|---|
| `VehicleDetailScreen` (extends `vehicles` feature) | `/vehicles/:id` | `GET .../maintenance-alerts` | — | Alert badges (color-coded by status) added to the existing screen |
| `MaintenanceHistoryScreen` | `/vehicles/:id/maintenance` | `GET .../maintenance-records` | — | List, newest first |
| `MaintenanceRecordFormScreen` | `/vehicles/:id/maintenance/new` | `GET /maintenance-types` | `POST .../maintenance-records` | Receipt photo via `expo-image-picker` |
| `MaintenanceTypesScreen` | `/maintenance-types` | `GET /maintenance-types` | `POST`/`DELETE` | System types read-only, custom types editable/deletable |

## Shared types

`packages/shared-types/src/vehicle-maintenance.ts`: `MaintenanceType`,
`MaintenanceAlertStatus`, `VehicleMaintenance`,
`CreateMaintenanceRecordInput`, `CreateMaintenanceTypeInput`.

## Error handling

- Alert status computation never throws — always resolves to a status
  even with sparse data (no prior service = `OVERDUE`/100%, matches spec).
- Registering a record with `mileage` below the vehicle's current
  mileage is allowed (only the *vehicle's stored* mileage never
  decreases — the recorded maintenance mileage is historical fact and
  simply doesn't bump the vehicle's value if it's lower).
