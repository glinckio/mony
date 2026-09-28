# Requirements — Vehicle Maintenance

## Summary

User-defined maintenance types, a maintenance history
per vehicle with an optional receipt (photo or PDF), and per-type alerts
driven by mileage and time — whichever signal is more urgent wins.
Thresholds match legacy (`funcoes_veiculos.php`,
`verificarManutencoesPendentes`) exactly, with the two legacy bugs noted
below fixed.

Owner decisions (2026-09-26):

- **No system default types** — same as legacy's database, which had
  none (its "common maintenances like oil change" promise was never
  backed by data). Every type is created by the user.
- A type that was never serviced on a vehicle is `OVERDUE` (100%) from
  day one — same as legacy.
- Receipts accept what legacy's form accepted (`.jpg`, `.jpeg`, `.png`,
  `.pdf`), but validated and stored privately like vehicle photos.

## User stories

- As a user, I want to define the maintenance types I care about (oil
  change, filters…), with a km interval and optionally a time interval,
  and have them tracked on all my vehicles.
- As a user, I want to see, per vehicle, which maintenances are overdue,
  urgent or coming up, and how far away each one is.
- As a user, I want to log a completed maintenance (with cost, place,
  notes and the invoice) and have its alert recalculated automatically.
- As a user, I want to see a vehicle's maintenance history and what I've
  spent on it.

## Acceptance criteria (EARS)

### Types

- WHEN a user creates a type (`name` 1–100 chars, `kmInterval`
  1–1,000,000, optional `monthsInterval` 1–120, optional `system`,
  optional `description` ≤ 255 chars), THE SYSTEM SHALL create an alert
  for it on **every** vehicle the user owns, with
  `mileageAlert = vehicle.currentMileage + kmInterval` (legacy
  `adicionarTipoManutencao`).
- WHEN a user lists types, THE SYSTEM SHALL return only their own.
- WHEN a user deletes a type they own that has no maintenance records,
  THE SYSTEM SHALL delete it and its alerts.
- IF the type has maintenance records, THEN THE SYSTEM SHALL refuse the
  deletion with 409 (legacy's foreign key made this delete fail too; the
  history is never deleted implicitly).
- IF the type belongs to another user, THEN THE SYSTEM SHALL answer 404.

### Alerts

- WHEN a vehicle is created, THE SYSTEM SHALL create one alert per type
  the user already has, with `mileageAlert = currentMileage + kmInterval`.
  (Legacy fix: legacy only did this for system defaults — of which there
  were none — so a type created before a vehicle never showed on it
  until a maintenance of that type was registered.)
- Vehicles created before this feature need nothing: users have no
  types yet.
- THE SYSTEM SHALL compute each alert's status on every read (never
  stored), from the vehicle's `currentMileage`, the alert's
  `mileageAlert`, the type's intervals and the type's latest record on
  that vehicle (highest mileage, then latest date):
  - km signal: no record → `OVERDUE` (100%). Else
    `kmRemaining = mileageAlert − currentMileage`; `kmRemaining ≤ 0` →
    `OVERDUE` (100%); `≤ 10%` of `kmInterval` → `URGENT` (90%);
    `≤ 20%` → `WARNING` (80%); else `ON_TRACK` with percent =
    km driven since the latest record ÷ `kmInterval` × 100, clamped to
    0–70 and rounded down.
  - time signal (only if the type has `monthsInterval` and a record
    exists): `nextDate = latest record date + monthsInterval` calendar
    months; `daysRemaining = nextDate − today` (date-only, UTC);
    `≤ 0` → `OVERDUE` (100%); `≤ 15` → `URGENT` (90%); `≤ 30` →
    `WARNING` (80%).
  - The result is the **more urgent** of the two signals: status and
    percent both take the max. (Legacy fix: legacy overwrote the status
    with the time signal's, so a km-overdue item within 30 days of its
    date read as merely "alerta".)
- THE SYSTEM SHALL list a vehicle's alerts ordered by percent, most
  urgent first (legacy), then by `kmRemaining` ascending.

### Records

- WHEN a user registers a maintenance (type, `mileage` ≥ 1, `date` not
  in the future, optional `cost` ≥ 0 with 2 decimals, `location` ≤ 100
  chars, `notes` ≤ 500 chars) on a vehicle they own, THE SYSTEM SHALL,
  in one transaction:
  - raise the vehicle's `currentMileage` to `mileage` if higher (never
    lower it — legacy);
  - insert the record;
  - set the type's alert on that vehicle to
    `latest record mileage + kmInterval`, creating the alert if missing.
    (Legacy fix: legacy used the _just-registered_ record even when it
    was an older one logged after the fact, which moved the alert
    backwards.)
- WHEN the registered `mileage` is below the vehicle's current mileage,
  THE SYSTEM SHALL accept it as a past maintenance (legacy warns, doesn't
  block; the app shows the same warning before saving).
- WHEN a user attaches a receipt to a record, THE SYSTEM SHALL accept a
  JPEG, PNG or WebP image (re-encoded to JPEG, all metadata stripped,
  same pipeline as vehicle photos) or a PDF, up to 10 MB, checked by
  content (magic bytes), never by declared type or file name; stored
  privately and returned only as a short-lived signed URL.
- WHEN a user lists a vehicle's records, THE SYSTEM SHALL return them
  newest first (date, then registration time), each with its type and
  receipt URL.
- WHEN a user deletes a record, THE SYSTEM SHALL delete its receipt and
  recalculate the type's alert from the remaining records (none left →
  `currentMileage + kmInterval`, legacy `atualizarAlertas`). Legacy
  didn't recalculate, which left alerts pointing at a deleted service.
- WHEN a vehicle is deleted, THE SYSTEM SHALL delete its alerts, records
  and receipts (DB cascade + the existing storage prefix sweep).
- Records are not editable (legacy had view + delete only).

### Mobile

- The vehicle screen shows the maintenance status (counts of overdue /
  urgent / warning and the most urgent items) and entry points to
  register a maintenance and to see all alerts and the history.
- All copy pt-BR; API error messages never shown raw.

## Out of scope

- Surfacing maintenance alerts on the dashboard or as push
  notifications (legacy didn't either — see `product.md`).
- Editing records or custom types; toggling alerts per vehicle (legacy's
  `alertas_manutencao.ativo` was never switched off by any screen, and
  `data_alerta` was never used — both dropped).
- Per-system spending statistics (legacy's "por sistema" card) — can be
  derived client-side later if wanted.

## Open questions

- None blocking.
