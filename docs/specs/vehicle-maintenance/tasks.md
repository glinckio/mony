# Tasks — Vehicle Maintenance

## API

- [ ] Prisma: `MaintenanceType`, `MaintenanceAlert`, `VehicleMaintenance`
      models, migration
- [ ] `prisma/seed.ts`: system default maintenance types
- [ ] `MaintenanceTypesModule`/`Controller`/`Service`
- [ ] `VehicleMaintenanceModule`/`Controller`/`Service`
- [ ] `configureDefaultAlerts()` hook: called from `VehiclesService` on
      vehicle creation (cross-feature call — same documented-exception
      pattern as `debts`→`transactions`)
- [ ] Custom-type creation fans out a new alert to all of that user's
      vehicles
- [ ] `computeStatus()` pure function implementing the exact threshold
      table from requirements.md
- [ ] Register-maintenance: bump vehicle mileage (never down), insert
      record, upsert alert's `mileageAlert`
- [ ] Delete vehicle: cascade alerts + records first (Prisma `onDelete:
      Cascade` handles this at the DB level — verify it's actually
      configured, don't rely on app-level cascade logic)
- [ ] Swagger decorators on all seven endpoints
- [ ] Update `docs/postman/collection.json` with examples
- [ ] Unit tests: `computeStatus()` against every threshold branch
      (never-serviced, km overdue/urgent/warning/on-track, time-based
      escalation overriding km-based, both signals present taking max),
      default-alert creation on vehicle create, custom-type fan-out,
      mileage bump rule
- [ ] E2E tests: create vehicle → verify default alerts exist → register
      a maintenance → verify alert recalculated → verify vehicle mileage
      bumped

## Shared types

- [ ] `packages/shared-types/src/vehicle-maintenance.ts`

## Mobile

- [ ] Alert badges on `VehicleDetailScreen`
- [ ] `MaintenanceHistoryScreen`
- [ ] `MaintenanceRecordFormScreen`
- [ ] `MaintenanceTypesScreen`
- [ ] Unit tests: alert badge color mapping, form validation
- [ ] Maestro flow: `e2e/flows/vehicle-maintenance.yaml` — register a
      maintenance, verify alert badge updates, verify vehicle mileage
      screen reflects the bump

## Review gates

- [ ] `code-reviewer` — threshold math correctness (this is the most
      complex derived-status logic in the app, worth extra scrutiny)
- [ ] `api-contract-guardian`
- [ ] `performance-auditor` — alert status computed per-request, not
      cached incorrectly across vehicles
- [ ] Lint + typecheck clean, all tests green
- [ ] `workflow-guardian` — commit message(s) drafted
