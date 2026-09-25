# Design — Vehicles

## Data model (Prisma)

```prisma
enum FuelType {
  GASOLINE
  ETHANOL
  FLEX
  DIESEL
  ELECTRIC
  HYBRID
  CNG
  OTHER
}

model Vehicle {
  id              String    @id @default(uuid())
  userId          String
  user            User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  make            String    @db.VarChar(100)
  model           String    @db.VarChar(100)
  manufactureYear Int
  modelYear       Int
  currentMileage  Int
  licensePlate    String?   @db.VarChar(10) // no uniqueness — matches legacy
  acquisitionDate DateTime? @db.Date
  color           String?   @db.VarChar(50)
  fuelType        FuelType?
  photoKey        String?   @db.VarChar(200) // object key in private storage, never a URL
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt

  @@index([userId, createdAt])
}
```

Legacy fuel keys map 1:1 (for the import script): gasolina→GASOLINE,
etanol→ETHANOL, flex→FLEX, diesel→DIESEL, eletrico→ELECTRIC,
hibrido→HYBRID, gas→CNG, outro→OTHER. Column widths follow legacy
(`marca`/`modelo` varchar(100), `cor` varchar(50)).

## API surface

| Method | Path | Auth | Request DTO | Response DTO | Error cases |
|---|---|---|---|---|---|
| GET | `/vehicles` | Bearer | — | `VehicleDto[]` | 401 |
| GET | `/vehicles/:id` | Bearer | — | `VehicleDto` | 401, 404 |
| POST | `/vehicles` | Bearer | `CreateVehicleDto` | `VehicleDto` | 400, 401 |
| PATCH | `/vehicles/:id` | Bearer | `UpdateVehicleDto` | `VehicleDto` | 400 (mileage decrease, modelYear < manufactureYear, validation), 401, 404 |
| DELETE | `/vehicles/:id` | Bearer | — | 204 | 401, 404 |
| PUT | `/vehicles/:id/photo` | Bearer | multipart, field `photo` | `VehicleDto` | 400 (missing file, extra form field, not JPEG/PNG/WebP, undecodable), 413 (> 5 MB, cut off by Multer), 401, 404, 409 (photo changed concurrently) |
| DELETE | `/vehicles/:id/photo` | Bearer | — | `VehicleDto` | 401, 404, 409 |

`VehicleDto`: `id, make, model, displayName, manufactureYear, modelYear,
currentMileage, licensePlate, acquisitionDate, color, fuelType,
photoUrl, createdAt, updatedAt` — `photoUrl` is a presigned GET URL (or
null) valid 60–90 minutes (see "Signing window"). `photoKey` is never a
response field, though the key is naturally the path of the signed URL —
it contains only the owner's own ids, so that's acceptable.

Photo is `PUT` (idempotent replace of the one photo) rather than the
first draft's `POST ... → { photoUrl }`: it returns the whole updated
vehicle so the client has one shape to cache, and a separate `DELETE`
removes it.

### Storage

`apps/api/src/common/storage/`: abstract `StorageService` with
`put(key, body, contentType)`, `getSignedUrl(key, ttlSeconds)`,
`delete(key)`, `deletePrefix(prefix)` (list + batch delete), provided by `StorageModule` (same factory pattern as
`MailerModule`):

- `MinioStorageService` — `@aws-sdk/client-s3` (`forcePathStyle: true`)
  against `MINIO_ENDPOINT`, bucket `MINIO_BUCKET`, keys
  `MINIO_ACCESS_KEY`/`MINIO_SECRET_KEY`. Presigning
  (`@aws-sdk/s3-request-presigner`, local computation, no network) uses
  `MINIO_PUBLIC_ENDPOINT` if set — the host the phone can reach (e.g.
  the dev machine's LAN IP) — else `MINIO_ENDPOINT`. The bucket is
  private; there is no public-read policy.
- `MemoryStorageService` — in-process map. Used when `NODE_ENV=test`
  (unit/e2e never need a running MinIO) and, with a startup warning,
  in development when `MINIO_ENDPOINT` isn't set. In production a
  missing `MINIO_ENDPOINT` is a startup error (same rule as Brevo), and
  so is a non-`https://` `MINIO_ENDPOINT`/`MINIO_PUBLIC_ENDPOINT` (photos
  and their URLs never travel in clear text — LGPD art. 46).

**Signing window.** URLs are signed as of the start of a 30-minute
window with `expiresIn = ttl + window` (ttl = 1 h), so a URL lives 60–90
minutes and every response within a window carries the *same* URL for an
object — the phone's image cache (keyed by full URL) hits instead of
re-downloading on every refetch (performance-auditor). Objects are
immutable (fresh key per upload), so they're served with
`Cache-Control: private, max-age=86400, immutable`.

**Credentials.** The API never uses the MinIO root login (its access key
is visible in every signed URL): it uses a dedicated user whose policy
allows only Get/Put/DeleteObject on `mony/*` and ListBucket on `mony`
(verified: it can't create buckets or change the bucket policy). Behind
a reverse proxy, the body limit must be at least 5 MB (nginx defaults to
1 MB).

Dev instance: Docker container `mony-minio` (API port 9010, console 9011 — 9000/9001 were taken by other local MinIOs), data in the `mony-minio-data` volume (start it with `MSYS_NO_PATHCONV=1` from Git Bash — otherwise `/data` is rewritten to a Windows path and the volume is silently unused), private bucket `mony`, API user `mony-api`; see `apps/api/.env.example`. Verified end to end: a signed URL serves the image, the same object unsigned is 403.

Object keys: `vehicles/{userId}/{vehicleId}/{uuid}.{ext}` — a fresh key
per upload, so a replaced photo's old signed URLs stop resolving once
the old object is deleted, and caches never serve a stale image under a
reused URL.

Upload validation happens in `VehiclesService`, on the buffer, before
any DB call: size <= 5 MB (also enforced by Multer — `limits.fileSize`
is 5 MB + 1 because busboy trips on *reaching* the limit — so an
oversized body is cut off early with 413; `fields: 0, files: 1`, so no
text field is ever buffered), and magic bytes — JPEG `FF D8 FF`, PNG
`89 50 4E 47 0D 0A 1A 0A`, WebP `RIFF????WEBP`. The declared mimetype
and file name are ignored.

Then `normalizePhoto` (`sharp`) decodes and re-encodes it: EXIF
orientation applied, then **all metadata dropped** (EXIF/GPS/XMP), max
1600 px longest side, transparency flattened on white, JPEG q80, and a
60 MP decode cap against decompression bombs. Only decoded pixels are
stored — a polyglot (valid header + smuggled payload) can't survive —
so every stored photo is `image/jpeg`, `.jpg`.

Vehicle delete removes the DB row first (`deleteMany` scoped by user —
404 on `count === 0`, never a P2025 500), then sweeps the whole
`vehicles/{userId}/{vehicleId}/` prefix, so anything a failed
best-effort delete left behind goes too (deleted personal data must not
linger; a failed sweep is logged and doesn't resurrect the row).

Photo replace uploads the new object, then **compare-and-swaps** the
row (`updateMany where photoKey = <key we read>`): on `count === 0`
another request won — our upload is deleted and the call fails 409 (404
if the vehicle is gone). On success the old object is deleted
(best-effort). Photo removal uses the same compare-and-swap.

Account deletion (release hardening, `roadmap.md`) must sweep
`vehicles/{userId}/` — the DB cascade from `User` never reaches storage.

## Mobile screens

Under the **Mais** tab (row `more-vehicles`, "Veículos").

| Screen | Route | Reads | Writes | Notes |
|---|---|---|---|---|
| `VehiclesListScreen` | stack `Vehicles` | `GET /vehicles` | — | Card per vehicle: photo (or placeholder icon), display name, plate, mileage |
| `VehicleDetailScreen` | stack `VehicleDetail { vehicleId }` | `GET /vehicles/:id` | `PATCH` (mileage), `PUT`/`DELETE .../photo`, `DELETE /vehicles/:id` | Photo with change/remove, details, "Atualizar quilometragem" sheet, placeholder section for maintenance (next feature) |
| `VehicleFormScreen` | modal `VehicleForm { vehicle? }` | — | `POST`/`PATCH /vehicles`, then `PUT .../photo` if a photo was picked | Photo picker via `expo-image-picker` (library; 4:3 crop on Android — iOS's picker crops square), then downscaled to 1600 px and re-encoded JPEG 0.7 with `expo-image-manipulator` (~250–400 KB); year inputs; fuel chips; edit sends only changed fields |

Photo upload is a second request after the vehicle save; if it fails
the vehicle is still saved and the screen says so (pt-BR), per the
original design's error-handling rule.

`api-client` gains FormData support: when the body is `FormData` it
doesn't set `Content-Type` (fetch adds the multipart boundary).

## Shared types

`packages/shared-types/src/vehicle.ts`: `FUEL_TYPES`/`fuelTypeSchema`/
`FuelType`, `vehicleSchema`/`Vehicle`, `createVehicleInputSchema`/
`CreateVehicleInput`, `updateVehicleInputSchema`/`UpdateVehicleInput`,
`updateMileageInputSchema`, `VEHICLE_PHOTO_MAX_BYTES`, year bounds.

## Error handling

- Mileage-decrease rejection → inline field error showing the current
  stored value (pt-BR), not a generic toast; the form also pre-validates
  against the value it loaded.
- Photo upload failure → vehicle save still succeeds without a photo;
  pt-BR notice, retry from the detail screen.
- Any other API failure → generic pt-BR copy, never the API `message`.
