# Tasks — Vehicles

## API

- [ ] Prisma: `Vehicle` model, migration
- [ ] Provision a local MinIO instance (e.g. `docker run minio/minio`) +
      bucket for dev; add `MINIO_ENDPOINT`/`MINIO_ACCESS_KEY`/
      `MINIO_SECRET_KEY`/`MINIO_BUCKET` to `.env`/`.env.example`
- [ ] Install `@aws-sdk/client-s3`
- [ ] `common/storage/storage.service.ts` interface + MinIO implementation
- [ ] `VehiclesModule`, `VehiclesController`, `VehiclesService`
- [ ] DTOs with validation + `@ApiProperty` examples
- [ ] Mileage-decrease guard on update
- [ ] Photo upload endpoint (multipart, size/type validation)
- [ ] Swagger decorators on all six endpoints
- [ ] Update `docs/postman/collection.json` with examples
- [ ] Unit tests: create, mileage-decrease rejected, mileage-increase
      accepted, photo upload validation
- [ ] E2E tests: create → update mileage (success + rejected case) →
      upload photo → delete

## Shared types

- [ ] `packages/shared-types/src/vehicle.ts`

## Mobile

- [ ] `VehiclesListScreen`
- [ ] `VehicleDetailScreen` (stub content until `vehicle-maintenance` lands)
- [ ] `VehicleFormScreen` with `expo-image-picker`
- [ ] Unit tests: form validation, mileage-decrease inline error
- [ ] Maestro flow: `e2e/flows/vehicles.yaml` — create a vehicle, update
      mileage, verify the decrease is rejected

## Review gates

- [ ] `code-reviewer`
- [ ] `api-contract-guardian`
- [ ] `lgpd-security-reviewer` — photo upload storage/access control (only owner can fetch)
- [ ] Lint + typecheck clean, all tests green
- [ ] `workflow-guardian` — commit message(s) drafted
