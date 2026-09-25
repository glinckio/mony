# Tasks — Vehicles

## API

- [x] Prisma: `Vehicle` model, `FuelType` enum, migration `add_vehicle`
- [x] Provision a local MinIO instance (Docker `mony-minio`, ports
      9010/9011, volume `mony-minio-data`) + private bucket `mony` +
      least-privilege API user `mony-api`; `MINIO_*` in `.env`/`.env.example`
- [x] Install `@aws-sdk/client-s3`, `@aws-sdk/s3-request-presigner`, `sharp`
- [x] `common/storage/`: `StorageService` (put / getSignedUrl /
      delete / deletePrefix) + MinIO and in-memory implementations,
      `StorageModule` factory (https required in production), magic-byte
      detection, `normalizePhoto` (re-encode, strip metadata, 1600 px cap)
- [x] `VehiclesModule`, `VehiclesController`, `VehiclesService`
- [x] DTOs with validation + `@ApiProperty` examples
- [x] Mileage-decrease guard on update (also in the UPDATE's WHERE);
      modelYear >= manufactureYear
- [x] Photo upload (`PUT`, multipart, magic-byte check, 5 MB inclusive,
      no extra fields) + photo delete; compare-and-swap (409 on a
      concurrent change); signed URLs in every response (30-min signing
      window); prefix sweep on vehicle delete
- [x] Swagger decorators on all seven endpoints
- [x] Update `docs/postman/collection.json` with examples (captured from
      the real API + MinIO, signatures elided)
- [x] Unit tests: create, mileage-decrease rejected, mileage-increase
      accepted, year order, photo upload validation + re-encode (EXIF
      stripped, 1600 px), CAS conflict, storage cleanup, MinIO signing
- [x] E2E tests: create → update mileage (success + rejected case) →
      upload photo → replace/delete photo → delete; ownership 404s; 5 MB
      boundary (exactly 5 MB passes the limit, +1 byte is 413); extra
      form field rejected

## Shared types

- [x] `packages/shared-types/src/vehicle.ts` (+ tests)

## Mobile

- [x] `api-client` FormData support
- [x] `Mais` → `Veículos` row; `Vehicles`/`VehicleDetail` stack routes,
      `VehicleForm` modal; new ui `PhotoFrame` (with load-error fallback)
- [x] `VehiclesListScreen`
- [x] `VehicleDetailScreen` (mileage sheet, photo change/remove; stub
      section for maintenance until `vehicle-maintenance` lands)
- [x] `VehicleFormScreen` with `expo-image-picker` + client-side downscale
      (`expo-image-manipulator`); edit sends only changed fields
- [x] Unit tests: form validation, mileage-decrease inline error (incl.
      the server-conflict path), create with failed photo upload
- [x] Maestro flow: `e2e/flows/vehicles.yaml` — create a vehicle, update
      mileage, verify the decrease is rejected (written; not run in this
      environment — needs a device)

## Review gates

- [x] `code-reviewer` — no High. Fixed all Medium: mileage-sheet reset
      wiped the conflict error; unbounded multipart fields; concurrent
      photo changes could orphan an object; signing-window docs drift.
      Fixed Lows: half-typed dates cleared stored ones (vehicles + debts),
      edits re-sent an unchanged mileage, any 400 shown as a mileage error,
      concurrent delete → 500, picker inside the upload mutation, blank
      box on a dead image URL, missing Postman statuses. Noted, not done:
      year-order check isn't atomic across two single-year PATCHes (very
      unlikely); fuel chips are the 5th inline chip picker (ChipPicker
      follow-up already spun off).
- [x] `qa-engineer` — added unit/e2e/mobile coverage (ownership, 401s,
      validation matrix, fuel enum, signing, conflict paths); found the
      mileage-sheet bug and the busboy 5 MB off-by-one (both fixed)
- [x] `api-contract-guardian` — PASS; fixed nullable typing on the update
      DTO, completed 400 descriptions and Postman examples
- [x] `performance-auditor` — fixed: new signed URL every response
      defeated the image cache (now windowed + `Cache-Control`), Android
      full-res thumbnail decode (`resizeMethod`), full-resolution uploads
      (client downscale), redundant refetches, detail placeholder data.
      Left: 3 queries on a successful update (negligible)
- [x] `lgpd-security-reviewer` — no blockers; only-owner access verified
      (unsigned → 403, no bucket policy). Fixed: root credentials replaced
      by a least-privilege user, https required in production, orphaned
      objects swept on delete, EXIF/GPS stripped server-side, dev volume
      not mounted, WRITE_EXTERNAL_STORAGE blocked, plate/photo listed as
      personal data in `product.md`, account deletion must sweep storage
      (`roadmap.md`)
- [x] Lint + typecheck clean, all tests green (API 189 unit / 127 e2e,
      mobile 112, shared-types 90); real end-to-end check against the dev
      API + MinIO (EXIF stripped, stable URL, prefix empty after delete)
- [x] `workflow-guardian` — commit message(s) drafted
