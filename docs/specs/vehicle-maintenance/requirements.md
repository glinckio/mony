# Requirements — Vehicle Maintenance

## Summary

Maintenance types (system defaults + user-custom), maintenance history,
and mileage/date-based alerts — whichever signal (km or time) is more
urgent wins. Matches legacy thresholds exactly.

## User stories

- As a user, I want default maintenance types (oil change, etc.) already
  set up when I add a vehicle.
- As a user, I want to define my own custom maintenance types.
- As a user, I want to see which maintenances are due soon or overdue.
- As a user, I want to log a completed maintenance and have the next
  alert recalculated automatically.

## Acceptance criteria (EARS)

- WHEN a vehicle is created, THE SYSTEM SHALL auto-create one
  `MaintenanceAlert` per system-default `MaintenanceType`
  (`isDefault=true`), with `mileageAlert = currentMileage +
  type.kmInterval`.
- WHEN a user creates a custom `MaintenanceType` (`isDefault=false`, tied
  to that user), THE SYSTEM SHALL auto-create a fresh alert for it across
  **all** of that user's existing vehicles.
- THE SYSTEM SHALL compute each alert's live status (not stored) as
  follows, taking the MORE urgent of the km-based and time-based signal:
  - km-based: never serviced, or `kmRemaining <= 0` → `OVERDUE` (100%);
    `kmRemaining <= 10%` of `kmInterval` → `URGENT` (90%); `<= 20%` →
    `WARNING` (80%); else `ON_TRACK` with wear% = km driven since last
    service, capped at 70%.
  - time-based (only if `type.monthsInterval` is set and a prior service
    exists): days until `lastServiceDate + monthsInterval` → `<=0` →
    `OVERDUE` (100%); `<=15 days` → `URGENT` (90%); `<=30 days` →
    `WARNING` (80%).
  - Final status/percent = `max()` of the two signals (time-based can only
    escalate urgency, never de-escalate below the km-based result).
- WHEN a user registers a completed maintenance (`mileage`, `date`,
  optional `cost`, `location`, `notes`, `receipt` upload), THE SYSTEM
  SHALL: bump the vehicle's `currentMileage` up if the reported mileage
  exceeds the stored value (never down), insert the
  `VehicleMaintenance` row, and upsert the corresponding
  `MaintenanceAlert.mileageAlert = mileage + type.kmInterval`.
- WHEN a user deletes a custom `MaintenanceType`, THE SYSTEM SHALL allow
  it only if created by that user (system defaults are never deletable),
  and cascade-delete its alerts.
- WHEN a user deletes a vehicle, THE SYSTEM SHALL cascade-delete its
  alerts and maintenance history first, in one transaction (completes the
  `vehicles` feature's deferred cascade).

## Out of scope

- Surfacing maintenance alerts on the dashboard (matches legacy — not
  wired there, see `product.md`).

## Open questions

- None blocking.
