# Design — Vehicle Maintenance

## Data model (Prisma)

```prisma
enum MaintenanceSystem {
  ENGINE
  BRAKES
  SUSPENSION
  TRANSMISSION
  ELECTRICAL
  COOLING
  FUEL
  LUBRICATION
  STEERING
  WHEELS_TIRES
  CLIMATE
  BODY
  OTHER
}

model MaintenanceType {
  id             String             @id @default(uuid())
  userId         String
  user           User               @relation(fields: [userId], references: [id], onDelete: Cascade)
  name           String             @db.VarChar(100)
  description    String?            @db.VarChar(255)
  system         MaintenanceSystem?
  kmInterval     Int
  monthsInterval Int?
  createdAt      DateTime           @default(now())

  alerts  MaintenanceAlert[]
  records VehicleMaintenance[]

  // List: WHERE userId ORDER BY system, name.
  @@index([userId, system, name])
}

model MaintenanceAlert {
  id                String          @id @default(uuid())
  vehicleId         String
  vehicle           Vehicle         @relation(fields: [vehicleId], references: [id], onDelete: Cascade)
  maintenanceTypeId String
  maintenanceType   MaintenanceType @relation(fields: [maintenanceTypeId], references: [id], onDelete: Cascade)
  mileageAlert      Int

  @@unique([vehicleId, maintenanceTypeId])
}

model VehicleMaintenance {
  id                String          @id @default(uuid())
  vehicleId         String
  vehicle           Vehicle         @relation(fields: [vehicleId], references: [id], onDelete: Cascade)
  maintenanceTypeId String
  // Cascade, so deleting a user always works whatever order Postgres fires
  // the User → Vehicle and User → MaintenanceType cascades in (RESTRICT or
  // NO ACTION here made it depend on trigger names — both fail if the type
  // side fires first). History is still never deleted implicitly: the
  // type-delete endpoint locks the type row and refuses (409) while records
  // exist.
  maintenanceType   MaintenanceType @relation(fields: [maintenanceTypeId], references: [id], onDelete: Cascade)
  mileage           Int
  date              DateTime        @db.Date
  cost              Decimal?        @db.Decimal(12, 2) // same cap as every money column (MAX_MONEY_AMOUNT)
  location          String?         @db.VarChar(100)
  notes             String?         @db.VarChar(500)
  // Object key in private storage — never a URL (same rule as Vehicle.photoKey).
  receiptKey        String?         @db.VarChar(200)
  createdAt         DateTime        @default(now())

  // History list: WHERE vehicleId ORDER BY date DESC, createdAt DESC.
  @@index([vehicleId, date])
  // "Latest record per type": WHERE vehicleId [AND maintenanceTypeId]
  // ORDER BY mileage DESC, date DESC.
  @@index([vehicleId, maintenanceTypeId, mileage])
}
```

Legacy mapping (for the import script): `tipos_manutencao.sistema`
(free text from a fixed `<select>`: Motor, Freios, Suspensão,
Transmissão, Elétrica, Arrefecimento, Combustível, Lubrificação,
Direção, Rodas e pneus, Climatização, Carroceria, Outros) maps 1:1 to
`MaintenanceSystem`; empty → null (legacy showed "Geral"). Legacy
`is_padrao` is dropped: there are no system types (owner decision —
legacy's database had none).
`alertas_manutencao.ativo`/`data_alerta` are dropped (never switched off
/ never read). `comprovante` (a public path) is re-uploaded into private
storage by the import.

## API surface

| Method | Path                                                   | Auth   | Request                      | Response                      | Errors                                                                                                                                 |
| ------ | ------------------------------------------------------ | ------ | ---------------------------- | ----------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| GET    | `/maintenance-types`                                   | Bearer | —                            | `MaintenanceTypeDto[]`        | 401                                                                                                                                    |
| POST   | `/maintenance-types`                                   | Bearer | `CreateMaintenanceTypeDto`   | `MaintenanceTypeDto` (201)    | 400, 401                                                                                                                               |
| DELETE | `/maintenance-types/:id`                               | Bearer | —                            | 204                           | 401, 404 (missing or another user's), 409 (has records)                                                                                |
| GET    | `/vehicles/:vehicleId/maintenance-alerts`              | Bearer | —                            | `MaintenanceAlertStatusDto[]` | 401, 404                                                                                                                               |
| GET    | `/vehicles/:vehicleId/maintenance-records`             | Bearer | —                            | `MaintenanceRecordDto[]`      | 401, 404                                                                                                                               |
| POST   | `/vehicles/:vehicleId/maintenance-records`             | Bearer | `CreateMaintenanceRecordDto` | `MaintenanceRecordDto` (201)  | 400 (validation, future date, type not visible), 401, 404                                                                              |
| PUT    | `/vehicles/:vehicleId/maintenance-records/:id/receipt` | Bearer | multipart, field `receipt`   | `MaintenanceRecordDto`        | 400 (missing file, extra field, not JPEG/PNG/WebP/PDF, undecodable image), 413 (> 10 MB), 401, 404, 409 (receipt changed concurrently) |
| DELETE | `/vehicles/:vehicleId/maintenance-records/:id`         | Bearer | —                            | 204                           | 401, 404                                                                                                                               |

Ids are plain strings (no `ParseUUIDPipe`, like every other controller):
junk ids simply match nothing and answer 404. Ownership is always checked through the vehicle (`vehicle.userId`);
someone else's vehicle or record is a 404, never a 403.

Sorting in `GET /maintenance-types`: by `system` (nulls last), then
name — the mobile picker groups by system (legacy grouped by `sistema`).

### DTOs

`MaintenanceTypeDto`: `id, name, description, system, kmInterval,
monthsInterval, createdAt`.

`CreateMaintenanceTypeDto`: `name` (trimmed, 1–100), `kmInterval`
(int 1–1,000,000), `monthsInterval?` (int 1–120), `system?`
(`MaintenanceSystem`), `description?` (≤ 255). Whitelisted, unknown
fields rejected (global `ValidationPipe`).

`MaintenanceAlertStatusDto` (computed, not the raw row):

```ts
{
  maintenanceTypeId: string;
  name: string; system: MaintenanceSystem | null;
  kmInterval: number; monthsInterval: number | null;
  status: "ON_TRACK" | "WARNING" | "URGENT" | "OVERDUE";
  percent: number;              // 0–100, integer
  nextMileage: number;          // the alert's mileageAlert
  kmRemaining: number;          // nextMileage − currentMileage (may be negative)
  nextDate: string | null;      // YYYY-MM-DD, only with a record + monthsInterval
  daysRemaining: number | null; // may be negative
  lastService: { date: string; mileage: number } | null;
}
```

`MaintenanceRecordDto`: `id, vehicleId, maintenanceTypeId, type: { name,
system }, mileage, date, cost (string|null, 2 decimals), location,
notes, receipt: { url, kind: "IMAGE" | "PDF" } | null, createdAt`.
`receipt.url` is a presigned GET URL with the same signing window as
vehicle photos (60–90 min); `kind` comes from the stored key's extension.

`CreateMaintenanceRecordDto`: `maintenanceTypeId` (uuid, must be one of
the user's types → else 400), `mileage` (int 1–9,999,999),
`date` (strict `YYYY-MM-DD`, ≤ today UTC), `cost?` (number ≥ 0, ≤ 2
decimals, ≤ `MAX_MONEY_AMOUNT`), `location?` (trim, ≤ 100), `notes?` (trim,
≤ 500). Blank optional strings become null.

### Status computation

`computeAlertStatus(input, today)` in
`src/vehicle-maintenance/alert-status.ts` — a pure function (no Prisma,
no clock: `today` is passed in), unit-tested against every branch of the
table in requirements.md. Inputs: `currentMileage`, `mileageAlert`,
`kmInterval`, `monthsInterval`, `lastService | null`. Month arithmetic
reuses `addMonthsToDateString` (`common/utils/date.util.ts`), so month
overflow behaves like the rest of the API (and like PHP's
`DateInterval('P{n}M')`). Percent uses `Math.floor`. Status rank
`ON_TRACK < WARNING < URGENT < OVERDUE`; the result takes the higher
rank and the higher percent.

`GET .../maintenance-alerts` is four queries in one round trip, whatever
the number of types, read from one snapshot (`$transaction([...])` at
REPEATABLE READ, so a concurrent record write can't mix a new last
service with the old mileage or alert): the vehicle (ownership +
mileage), the user's types, the vehicle's alerts, and the latest record
per type (`findMany where vehicleId, orderBy [maintenanceTypeId desc,
mileage desc, date desc], distinct [maintenanceTypeId]` — all-descending
so the index serves the order; Prisma 5 applies `distinct` in memory,
fine at a vehicle's record count). A user's type without an alert row on this
vehicle (e.g. a type created while the vehicle insert was in flight) is
reported as if `mileageAlert = currentMileage + kmInterval`, without
writing on a GET.

### Writes

- **Vehicle create** (`VehiclesService.create`): inside the same
  `$transaction` as the insert, `createAlertsForVehicle` (`alert-sync.ts`)
  creates one alert per type the user has (`createMany`).
- **Type create**: insert + `createMany` alerts for every vehicle of the
  user, one transaction.
- **Type delete**: one transaction — `SELECT … FOR UPDATE` on the type
  row (scoped by user → 404), then any record → 409, else delete (alerts
  and — never, given the check — records cascade). The row lock makes the
  check airtight against a concurrent record insert: an insert already in
  flight holds a key-share lock through its FK, so we wait and then see
  its row; one that starts after us waits for our delete, then fails its
  FK (P2003 → 400 in record create).
- **Record create**: one interactive transaction — `lockOwnedVehicle`
  (`SELECT … FOR NO KEY UPDATE` on the owned vehicle: serializes record
  writes per vehicle without blocking other transactions' FK checks),
  raise the mileage if higher, `vehicleMaintenance.create`, then
  `syncAlert`: the latest record for the type (it may not be the new one)
  → `maintenanceAlert.upsert` with `latest.mileage + kmInterval`.
- **Record delete**: transaction — `lockOwnedVehicle`, delete the record,
  `syncAlert` from the remaining latest record or `currentMileage +
kmInterval`; after commit, sweep the record's whole storage prefix
  `…/maintenance/{recordId}/` (best-effort, logged) — so a receipt a
  failed replace or a crash left behind goes too, not just the one the
  row pointed at.
- **Receipt upload**: same shape as the vehicle photo. Multer
  `limits: { fileSize: 10 MB + 1, fields: 0, files: 1 }` (413 when
  exceeded). Content sniffing on the buffer: JPEG/PNG/WebP →
  `normalizePhoto` (EXIF/GPS stripped, ≤ 2560 px — more than vehicle
  photos so an invoice stays legible —, JPEG q80 without mozjpeg — ~10x
  faster to encode for ~10–15% more bytes, fine for a file written once —,
  60 MP cap),
  stored `.jpg`; `%PDF-` header → stored as-is `.pdf`,
  `application/pdf`, after checking it ends with a `%%EOF` marker within
  the last 1 KB (rejects truncated uploads). Anything else → 400.
  Key: `vehicles/{userId}/{vehicleId}/maintenance/{recordId}/{uuid}.{jpg|pdf}`
  — under the vehicle's prefix, so the existing vehicle-delete sweep also
  removes receipts. Replace = upload, then compare-and-swap
  `updateMany where receiptKey = <read value>` under `lockOwnedVehicle`
  (so it can't interleave with a record delete; 409 on a lost race, our
  object deleted), then delete the old object.
- Signed URLs are cached per key within their signing window in
  `MinioStorageService` (presigning is ~1 ms of CPU each and the history
  mints one per receipt on every fetch); `deletePrefix` now throws when a
  batch delete reports per-key errors, so the callers log them.
- PDF metadata (author, producer) is not rewritten — it's the user's own
  invoice, stored privately; noted for the LGPD review.

### Module layout

`src/vehicle-maintenance/`: `maintenance-types.controller.ts` +
`maintenance-types.service.ts` (types), `vehicle-maintenance.controller.ts`

- `vehicle-maintenance.service.ts` (alerts, records, receipts under
  `/vehicles/:vehicleId`), `alert-status.ts` (pure status computation),
  `alert-sync.ts` (the alert writes run inside the caller's transaction:
  `createAlertsForVehicle`, `syncAlert`, and `lockOwnedVehicle`, a
  `SELECT … FOR UPDATE` on the vehicle that serializes record writes so two
  concurrent adds/deletes can't leave a stale alert), `receipt.ts` (content
  sniffing + normalization), `dto/`. `VehiclesService.create` imports
  `createAlertsForVehicle` directly — same documented cross-feature
  exception as `common/debt-sync`, no module dependency.

## Mobile screens

| Screen                                     | Route                                                           | Reads                        | Writes                                                 | Notes                                                                                                                                                                                                                                                                                                                 |
| ------------------------------------------ | --------------------------------------------------------------- | ---------------------------- | ------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `VehicleDetailScreen` (extends `vehicles`) | stack `VehicleDetail { vehicleId }`                             | `GET .../maintenance-alerts` | —                                                      | Replaces the "Em breve" card: counts (atrasadas / urgentes / atenção), the 3 most urgent items with a progress bar, "Registrar manutenção" and "Ver manutenções". No types yet → the card explains what to track and links to creating the first type                                                                 |
| `MaintenanceScreen`                        | stack `Maintenance { vehicleId }`                               | alerts + records             | —                                                      | Segmented "Alertas" / "Histórico". Alertas: every type, grouped by urgency, tap → record form with the type preselected (legacy `tipo_id`). Histórico: records newest first with the total spent; tap → record sheet. Header action → Tipos                                                                           |
| Record sheet (in `MaintenanceScreen`)      | `PaperSheet`                                                    | —                            | `DELETE .../maintenance-records/:id`                   | Details; receipt (image inline, re-fetched if its signed URL expired; PDF opens in the in-app browser); "Anexar/Trocar comprovante" (camera, gallery, PDF — also the retry path when the form's upload failed); delete confirmed in the same sheet                                                                    |
| `MaintenanceRecordFormScreen`              | modal `MaintenanceRecordForm { vehicleId, maintenanceTypeId? }` | types, vehicle               | `POST .../maintenance-records`, then `PUT .../receipt` | Type picker grouped by system, with "Criar tipo" (like the transaction form's "Criar categoria"); mileage prefilled with the vehicle's; date today; cost (`AmountField`), place, notes; receipt from camera, gallery or a PDF file. Inline warning when mileage < current ("será registrada como manutenção passada") |
| `MaintenanceTypesScreen`                   | stack `MaintenanceTypes`                                        | `GET /maintenance-types`     | `DELETE`                                               | Grouped by system; delete via `ConfirmSheet` (409 → pt-BR "tem manutenções registradas"); empty state suggests what to track (óleo, filtros, pneus, freios)                                                                                                                                                           |
| `MaintenanceTypeFormScreen`                | modal `MaintenanceTypeForm`                                     | —                            | `POST /maintenance-types`                              | Name, system chips, km interval, months interval (optional), description                                                                                                                                                                                                                                              |

Status presentation (pt-BR, `StatusPill` kinds): `OVERDUE` "Atrasada"
(danger), `URGENT` "Urgente" (danger), `WARNING` "Atenção" (warning),
`ON_TRACK` "Em dia" (success). Distance copy: "Faltam 1.200 km" /
"Passou 300 km" / "Nunca registrada"; time: "Vence em 12 dias" /
"Venceu há 5 dias". System labels and status copy live in
`apps/mobile/src/lib/maintenance-display.ts`.

The receipt upload is a second request after the record save; if it
fails, the record is kept and the screen says so (same rule as vehicle
photos); the toast points to the record sheet to attach it again. The
local copy (downscaled photo, the picker's PDF copy) is deleted right
after the upload or when discarded. Receipt photos are downscaled on the
device to the same 2560 px. New dependencies (installed by the owner):
`expo-document-picker` (PDF), `expo-web-browser` (opens the PDF's signed
URL in an in-app browser). On iOS that's SFSafariViewController: inline,
out of Safari's history. **On Android** it's a Custom Tab of the default
browser, whose PDF handling varies (some versions download the file to
public Downloads, and visits land in the browser's history) — to verify
on the ADB device; if it downloads, switch Android to download into the
app cache and open with a content-URI intent.

Fetching: no refetch-on-focus on these screens — every write (records,
types, the mileage sheet, the vehicle form) invalidates the affected
keys, so a focus refetch would only duplicate requests. A record delete
invalidates only the maintenance lists (it never lowers the mileage); a
record create touches the vehicle keys only when it raised the mileage. Camera capture uses the
already-installed `expo-image-picker` (camera permission strings in
`app.json`, pt-BR).

Dev tooling: the in-memory mock API (`src/dev/mock-api`) and the screen
catalog get the new endpoints and screens, and `design/telas.md` the new
screen specs, so they go through the same visual review as the rest.

## Shared types

`packages/shared-types/src/vehicle-maintenance.ts`: `MAINTENANCE_SYSTEMS`,
`maintenanceSystemSchema`, `MAINTENANCE_STATUSES`, `maintenanceTypeSchema`,
`createMaintenanceTypeInputSchema`, `maintenanceAlertStatusSchema`,
`maintenanceRecordSchema`, `createMaintenanceRecordInputSchema`,
`MAINTENANCE_RECEIPT_MAX_BYTES` (10 MB), and the inferred types.

## Error handling

- Status computation never throws — sparse data always resolves to a
  status (no record → `OVERDUE`/100%).
- Mobile maps 409 on type delete → "Esse tipo tem manutenções
  registradas. Exclua os registros antes."; 413/400 on receipt →
  "O comprovante precisa ser uma foto ou PDF de até 10 MB."; future date
  is pre-validated by the form; anything else → generic pt-BR copy.
- A failed receipt upload never loses the record.
