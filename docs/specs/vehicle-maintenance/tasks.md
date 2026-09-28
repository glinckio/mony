# Tasks — Vehicle Maintenance

## Shared types

- [x] `packages/shared-types/src/vehicle-maintenance.ts` (schemas,
      constants, inferred types) + export from the package index
- [x] Unit tests: create-type and create-record input schemas (bounds,
      decimals, blank optionals, future date)

## API

- [x] Prisma: `MaintenanceSystem` enum, `MaintenanceType`,
      `MaintenanceAlert`, `VehicleMaintenance`; relations on `User` and
      `Vehicle`
- [x] Migration: tables, enum, indexes, FKs (cascade vehicle→alerts/
      records, type→alerts and type→records — cascade, so a user delete works in any
      cascade order; the type-delete endpoint guards history with a row lock + 409)
- [x] `alert-status.ts`: pure `computeAlertStatus()` implementing the
      requirements table (max of km and time signals)
- [x] `MaintenanceTypesService`/controller: list, create (fan-out alerts
      to all the user's vehicles), delete (404 foreign, 409 with records)
- [x] Alerts: status list (vehicle + 3 parallel queries), and
      `alert-sync.ts` `createAlertsForVehicle()` — `VehiclesService.create`
      calls it in the same transaction
- [x] `VehicleMaintenanceService`/controller: list, create (raise
      mileage, insert, recompute alert from the latest record), delete
      (recompute alert, remove receipt), receipt upload (image →
      `normalizePhoto`, PDF sniff + `%%EOF` check, 10 MB, compare-and-swap)
- [x] Verify vehicle delete removes alerts/records (DB cascade) and
      receipts (existing prefix sweep)
- [x] Swagger decorators on all eight endpoints
- [x] `docs/postman/collection.json`: real examples for all eight
- [x] Unit tests: `computeAlertStatus()` for every branch (no record;
      km overdue/urgent/warning/on-track incl. the 70% cap and negative
      driven km; time overdue/urgent/warning; time escalating km;
      km more urgent than time — status must not drop), month overflow;
      receipt sniffing (`receipt.spec.ts`); the service behaviors (fan-out,
      mileage raise-only, alert from the latest record, delete
      recalculation, type delete 409/404, prefix sweep, user delete with
      history) are covered by the e2e against the real DB
- [x] E2E: create a type → create vehicle → its alert exists and is
      `OVERDUE` →
      register a maintenance → alert recalculated + vehicle mileage
      raised → register an older one → alert unchanged → delete the
      newest → alert falls back → receipt image + PDF + junk (400) +
      oversize (413) → new type fans out to existing vehicles → type delete 409 then 204 →
      another user gets 404 everywhere

## Mobile

- [x] Owner installs `expo-document-picker` and `expo-web-browser`
      (`npx expo install` in `apps/mobile`); camera permission strings in
      `app.json`
- [x] `lib/maintenance-display.ts`: system labels, status
      → pill kind/tone, distance/time copy
- [x] `StatusPill` kinds for the four statuses
- [x] `VehicleDetailScreen`: maintenance card (counts, top 3, actions;
      no-types state)
- [x] `MaintenanceScreen` (Alertas / Histórico + record sheet + delete)
- [x] `MaintenanceRecordFormScreen` (type picker, prefilled mileage/date,
      past-maintenance warning, receipt: camera / gallery / PDF, upload
      after save)
- [x] `MaintenanceTypesScreen` + `MaintenanceTypeFormScreen`
- [x] Navigation routes + types
- [x] Dev: mock API routes, catalog entries, `design/telas.md` specs
- [x] Unit tests: display mapping, form validation, 409/413 copy, alert
      card, record delete flow
- [x] Maestro `e2e/flows/vehicle-maintenance.yaml` (written; not run — needs a device): create a type,
      register a maintenance, alert leaves "Atrasada", vehicle mileage
      shows the raise; type delete

## Review gates

- [x] `code-reviewer` — threshold math (the most complex derived status
      in the app) and the transactions
- [x] `api-contract-guardian` (Swagger complete; Postman "Vehicle Maintenance" folder with captured examples)
- [x] `performance-auditor` — alerts endpoint query count, list signing
- [x] `lgpd-security-reviewer` — receipts (PDF handling, private
      storage, deletion paths)
- [x] `qa-engineer`
- [x] Lint + typecheck clean, all tests green
- [x] `workflow-guardian` — commit message(s) drafted
