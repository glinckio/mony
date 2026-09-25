# Requirements — Vehicles

## Summary

Vehicle registry with mileage tracking and an optional photo. Not
workspace-scoped (matches legacy — vehicles are user-level). Foundation
for the `vehicle-maintenance` feature. Legacy: `funcoes_veiculos.php`,
`veiculos.php`, `veiculo_adicionar.php`, `veiculo_detalhes.php`.

## User stories

- As a user, I want to register a vehicle with make, model, years, and
  current mileage.
- As a user, I want to update the vehicle's mileage over time, but never
  accidentally lower it.
- As a user, I want to add a photo of my vehicle that only I can see.

## Acceptance criteria (EARS)

- WHEN a user creates a vehicle, THE SYSTEM SHALL require `make` (1–100
  chars), `model` (1–100), `manufactureYear` and `modelYear` (each
  1901 … current year + 1, legacy's year range), `currentMileage`
  (integer >= 0); `licensePlate` (<= 10 chars, no format/uniqueness
  check — matches legacy), `acquisitionDate`, `color` (<= 50), and
  `fuelType` are optional.
- IF `modelYear < manufactureYear`, THEN THE SYSTEM SHALL reject with
  400. (Legacy only enforced this in the browser; the rebuild enforces
  it server-side too, on create and on update against the merged values.)
- `fuelType` is one of legacy's fixed list: gasoline, ethanol, flex,
  diesel, electric, hybrid, CNG ("GNV"), other.
- IF a mileage update's new value is less than the currently stored
  value, THEN THE SYSTEM SHALL reject with 400 ("New mileage cannot be
  lower than the current value ({current} km).") — matches legacy
  exactly (API message in English per the language policy; the app
  shows its own pt-BR copy with the current value).
- THE SYSTEM SHALL list a user's vehicles newest first (id as the
  tiebreak), each with a display name `"{make} {model} {modelYear}"`
  (legacy `nome_completo`). **Deliberate change:** legacy sorted by make,
  then model; newest-first puts the vehicle just added on top.
- WHEN a user uploads a vehicle photo, THE SYSTEM SHALL accept only
  JPEG, PNG, or WebP — detected from the file's content, not its name or
  declared type — up to and including 5 MB (larger: 413), with no other
  form fields (400); it SHALL decode and re-encode it as a JPEG of at
  most 1600 px on the longest side, **dropping all metadata (EXIF/GPS)**
  — the uploaded bytes are never stored as-is (400 if they don't decode)
  — store it in private object storage (MinIO), replace (and delete) any
  previous photo, and return the vehicle. (Legacy saved any uploaded
  file, with the uploader's own extension and metadata, into a public
  web folder — a stored-file/XSS and privacy risk not carried over.)
- IF another request changes the same vehicle's photo concurrently, THEN
  the later write SHALL fail with 409 and remove its own upload, rather
  than leave an object nothing references.
- THE SYSTEM SHALL never expose a permanent/public photo URL: every
  vehicle response carries a short-lived signed URL, valid for 60–90
  minutes (signed as of the start of a 30-minute window, so repeated
  responses reuse the same URL and the app's image cache works), so only
  the owner — who can read the vehicle — can fetch the image. The bucket
  itself denies unsigned reads.
- WHEN a user deletes a vehicle photo, THE SYSTEM SHALL remove it from
  storage and clear it on the vehicle.
- WHEN a user deletes a vehicle, THE SYSTEM SHALL delete **everything**
  stored under that vehicle (not only the current photo — also anything a
  failed cleanup or lost race left behind), and cascade-delete its
  maintenance alerts and history (those tables arrive with
  `vehicle-maintenance`; the FK cascade covers them then).
- Every by-id route is user-scoped: another user's vehicle id is a 404.

## Deferred to `vehicle-maintenance`

- Legacy `configurarAlertasPadrao()` creates one default maintenance
  alert per maintenance type when a vehicle is created. Maintenance
  types/alerts don't exist yet; `vehicle-maintenance` must add that
  hook (or create alerts lazily) — it's not silently dropped.

## Out of scope

- License plate format validation/uniqueness (matches legacy — none).
- Multiple photos per vehicle.

## Open questions

- None blocking. Photo storage confirmed: **MinIO** (S3-compatible,
  self-hosted), dev instance via Docker (owner decision 2026-09-25).
