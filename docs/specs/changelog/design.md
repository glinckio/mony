# Design — Changelog

## Data model (Prisma)

```prisma
enum ChangelogStatus {
  ACTIVE
  INACTIVE
}

model ChangelogEntry {
  id          String          @id @default(uuid())
  title       String          @db.VarChar(150)
  description String          @db.Text
  videoUrl    String?
  publishedAt DateTime        @default(now())
  expiresAt   DateTime?
  status      ChangelogStatus @default(ACTIVE)
  createdById String
  createdBy   User            @relation(fields: [createdById], references: [id])

  reads ChangelogRead[]
}

model ChangelogRead {
  id        String         @id @default(uuid())
  entryId   String
  entry     ChangelogEntry @relation(fields: [entryId], references: [id], onDelete: Cascade)
  userId    String
  user      User           @relation(fields: [userId], references: [id], onDelete: Cascade)
  readAt    DateTime       @default(now())

  @@unique([entryId, userId])
}
```

## API surface

| Method | Path | Auth | Request DTO | Response DTO | Error cases |
|---|---|---|---|---|---|
| GET | `/changelog/unread` | Bearer | — | `ChangelogEntryDto[]` | 401 |
| POST | `/changelog/:id/read` | Bearer | — | 204 | 401, 404 |
| GET | `/changelog` (admin) | Bearer + `role=ADMIN` | — | `ChangelogEntryDto[]` | 401, 403 |
| POST | `/changelog` (admin) | Bearer + `role=ADMIN` | `CreateChangelogDto` | `ChangelogEntryDto` | 400, 401, 403 |
| PATCH | `/changelog/:id` (admin) | Bearer + `role=ADMIN` | `UpdateChangelogDto` | `ChangelogEntryDto` | 400, 401, 403, 404 |
| DELETE | `/changelog/:id` (admin) | Bearer + `role=ADMIN` | — | 204 | 401, 403, 404 |

`RolesGuard` (new, alongside the existing `AuthGuard`) checks
`request.user.role`, reused by any future admin-only endpoint.

**Scheduled job**: `ChangelogService.expireOldEntries()`, registered via
`@nestjs/schedule`'s `@Cron('0 3 * * *')` (daily at 03:00), flips
`status=INACTIVE` where `expiresAt < now() AND status=ACTIVE`.

`videoUrl` normalization happens in `ChangelogService` on create/update —
pure function `normalizeYoutubeUrl(url)`, unit-testable without a DB.

## Mobile screens

| Screen | Route | Reads | Writes | Notes |
|---|---|---|---|---|
| Changelog banner/modal | on `DashboardScreen` (fills the slot left in the `dashboard` feature) | `GET /changelog/unread` | `POST /changelog/:id/read` | Shows the oldest unread entry; dismiss = mark read |
| `AdminChangelogScreen` | `/admin/changelog` | `GET /changelog` | `POST`/`PATCH`/`DELETE /changelog` | Only rendered/reachable if `user.role === "ADMIN"` (client-side gate; server enforces independently) |

## Shared types

`packages/shared-types/src/changelog.ts`: `ChangelogEntry`,
`CreateChangelogInput`, `UpdateChangelogInput`.

## Error handling

- Non-admin hitting admin endpoints → 403, client never shows the admin
  screen to non-admins in the first place (defense in depth).
- Mark-read on an already-read entry → idempotent success, not an error.
