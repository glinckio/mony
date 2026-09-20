# Requirements — Vehicles

## Summary

Vehicle registry with mileage tracking. Not workspace-scoped (matches
legacy — vehicles are user-level). Foundation for the
`vehicle-maintenance` feature.

## User stories

- As a user, I want to register a vehicle with make, model, year, and
  current mileage.
- As a user, I want to update the vehicle's mileage over time, but never
  accidentally lower it.

## Acceptance criteria (EARS)

- WHEN a user creates a vehicle, THE SYSTEM SHALL require `make`,
  `model`, `manufactureYear`, `modelYear`, `currentMileage` (>= 0);
  `licensePlate` (no uniqueness check — matches legacy), `acquisitionDate`,
  `color`, `fuelType`, `photo` are optional.
- IF a mileage update's new value is less than the currently stored value,
  THEN THE SYSTEM SHALL reject with 400 ("New mileage cannot be lower than
  the current value ({current} km).") — matches legacy exactly.
- WHEN a user uploads a vehicle photo, THE SYSTEM SHALL store it and
  return a URL (see design.md for storage approach — legacy used local
  `uploads/`, the rebuild needs a cloud-appropriate equivalent).
- WHEN a user deletes a vehicle, THE SYSTEM SHALL cascade-delete its
  maintenance alerts and maintenance history (handled fully once
  `vehicle-maintenance` lands; this feature's delete works standalone
  until then since those tables don't exist yet).

## Out of scope

- License plate format validation/uniqueness (matches legacy — none).

## Open questions

- None blocking. Photo storage confirmed: **MinIO** (S3-compatible,
  self-hosted) — replaces legacy's local filesystem uploads. See `design.md`.
