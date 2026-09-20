# Design — Vehicles

## Data model (Prisma)

```prisma
model Vehicle {
  id                String    @id @default(uuid())
  userId            String
  user              User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  make              String    @db.VarChar(50)
  model             String    @db.VarChar(50)
  manufactureYear    Int
  modelYear          Int
  currentMileage    Int
  licensePlate      String?   @db.VarChar(10) // no uniqueness — matches legacy
  acquisitionDate   DateTime? @db.Date
  color             String?   @db.VarChar(30)
  fuelType          String?   @db.VarChar(30)
  photoUrl          String?
  createdAt         DateTime  @default(now())
  updatedAt         DateTime  @updatedAt

  @@index([userId])
}
```

## API surface

| Method | Path | Auth | Request DTO | Response DTO | Error cases |
|---|---|---|---|---|---|
| GET | `/vehicles` | Bearer | — | `VehicleDto[]` | 401 |
| GET | `/vehicles/:id` | Bearer | — | `VehicleDto` | 401, 404 |
| POST | `/vehicles` | Bearer | `CreateVehicleDto` | `VehicleDto` | 400, 401 |
| PATCH | `/vehicles/:id` | Bearer | `UpdateVehicleDto` | `VehicleDto` | 400 (mileage decrease), 401, 404 |
| DELETE | `/vehicles/:id` | Bearer | — | 204 | 401, 404 |
| POST | `/vehicles/:id/photo` | Bearer | multipart file | `{ photoUrl: string }` | 400 (bad file type/size), 401, 404 |

**Photo storage**: `StorageService` interface in
`apps/api/src/common/storage/` with one method,
`upload(buffer, key): Promise<url>`. Concrete implementation uses
**MinIO** via `@aws-sdk/client-s3` (S3-compatible API) —
`MINIO_ENDPOINT`, `MINIO_ACCESS_KEY`, `MINIO_SECRET_KEY`, `MINIO_BUCKET`
from `.env`. Kept behind an interface so `vehicle-maintenance` (receipts)
reuses the exact same service, and any future provider swap doesn't
touch `VehiclesService`.

## Mobile screens

| Screen | Route | Reads | Writes | Notes |
|---|---|---|---|---|
| `VehiclesListScreen` | `/vehicles` | `GET /vehicles` | — | Card per vehicle with photo, make/model, current mileage |
| `VehicleDetailScreen` | `/vehicles/:id` | `GET /vehicles/:id` | — | Entry point to `vehicle-maintenance` screens (added next feature) |
| `VehicleFormScreen` | `/vehicles/new`, `/vehicles/:id/edit` | — | `POST`/`PATCH /vehicles`, `POST /vehicles/:id/photo` | Photo picker via `expo-image-picker` |

## Shared types

`packages/shared-types/src/vehicle.ts`: `Vehicle`, `CreateVehicleInput`,
`UpdateVehicleInput`.

## Error handling

- Mileage-decrease rejection → inline field error showing the current
  stored value, not a generic toast.
- Photo upload failure → vehicle save still succeeds without a photo;
  photo upload is a separate request, not blocking the main form submit.
