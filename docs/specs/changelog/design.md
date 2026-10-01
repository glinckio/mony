# Design — Changelog ("Novidades")

## Data model (Prisma)

```prisma
enum ChangelogStatus {
  ACTIVE
  INACTIVE
}

model ChangelogEntry {
  id          String          @id @default(uuid())
  title       String          @db.VarChar(150)
  // Plain text (paragraphs / line breaks); never rendered as HTML.
  description String          @db.Text
  // YouTube video id only (validated on save); the app builds the link.
  videoId     String?         @db.VarChar(32)
  publishedAt DateTime        @default(now())
  // Legacy's data_validade: shown while today <= expiresAt.
  expiresAt   DateTime?       @db.Date
  status      ChangelogStatus @default(ACTIVE)
  // Kept when the author's account goes away.
  createdById String?
  createdBy   User?           @relation("ChangelogAuthor", fields: [createdById], references: [id], onDelete: SetNull)
  createdAt   DateTime        @default(now())
  updatedAt   DateTime        @updatedAt

  reads ChangelogRead[]

  @@index([status, publishedAt])
}

model ChangelogRead {
  id      String         @id @default(uuid())
  entryId String
  entry   ChangelogEntry @relation(fields: [entryId], references: [id], onDelete: Cascade)
  userId  String
  user    User           @relation(fields: [userId], references: [id], onDelete: Cascade)
  readAt  DateTime       @default(now())

  @@unique([entryId, userId])
  @@index([userId])
}
```

"Today" is the server's UTC date, like the rest of the API.

## API surface

User endpoints (`JwtAuthGuard`):

| Method | Path                  | Response                                                                      | Errors   |
| ------ | --------------------- | ----------------------------------------------------------------------------- | -------- |
| GET    | `/changelog/unread`   | `{ entry: ChangelogEntryDto \| null, total }`: the newest unread + how many   | 401      |
| GET    | `/changelog`          | `{ entries: ChangelogEntryDto[] }` (all visible, with `readAt`), newest first | 401      |
| POST   | `/changelog/:id/read` | 204 (idempotent: `createMany` + `skipDuplicates`)                             | 401, 404 |

Admin endpoints (`JwtAuthGuard` + `AdminGuard`):

| Method | Path                   | Request              | Response                   | Errors             |
| ------ | ---------------------- | -------------------- | -------------------------- | ------------------ |
| GET    | `/admin/changelog`     | —                    | `AdminChangelogEntryDto[]` | 401, 403           |
| POST   | `/admin/changelog`     | `CreateChangelogDto` | `AdminChangelogEntryDto`   | 400, 401, 403      |
| PATCH  | `/admin/changelog/:id` | `UpdateChangelogDto` | `AdminChangelogEntryDto`   | 400, 401, 403, 404 |
| DELETE | `/admin/changelog/:id` | —                    | 204                        | 401, 403, 404      |

- `ChangelogEntryDto`: `id, title, description, videoId|null,
publishedAt, expiresAt|null (YYYY-MM-DD), readAt|null`.
- `AdminChangelogEntryDto`: those minus `readAt`, plus `status,
readCount, authorName|null`.
- `CreateChangelogDto`: `title` (1–150, trimmed), `description` (1–5000,
  trimmed), `videoUrl?` (YouTube link → `videoId`), `expiresAt?`
  (`YYYY-MM-DD`). `UpdateChangelogDto`: all optional + `status`;
  `videoUrl`/`expiresAt` accept `null` to clear; `null` on `title`,
  `description` or `status` is a 400 (`@ValidateIf(isProvided)`).
- Unread is one entry plus a count, not the list: the app only ever
  shows the newest (legacy), and the list would grow on every launch for
  someone who always taps "Fechar".

Visibility (`status = ACTIVE AND (expiresAt IS NULL OR expiresAt >=
today) AND publishedAt >= user.createdAt`) lives in one Prisma `where`
builder used by unread, history and mark-read.

**`AdminGuard`** (`src/auth/guards/admin.guard.ts`): reads the caller's
`role` and `status` from the database (the JWT can outlive a demotion or
a suspension) and answers 403 unless `ADMIN` and `ACTIVE`. Reusable for
any future admin endpoint.

**Expiry job**: `@nestjs/schedule` (`ScheduleModule.forRoot()` in
`AppModule`, off under `NODE_ENV=test`), `runExpirySweep()` with
`@Cron("5 0 * * *", { timeZone: "UTC" })` (00:05 UTC daily) →
`expireOld(today)`: `updateMany({ status: ACTIVE, expiresAt < today } →
INACTIVE)`; logs the count. Reads also filter by expiry, so a missed run
never shows an expired entry.

`youtubeVideoId(url)` — pure function: `watch?v=`, `youtu.be/`,
`shorts/`, `embed/` (with or without `www.`/`m.`), ids of 11 chars
`[A-Za-z0-9_-]`; anything else → 400.

**Auth user carries the role:** `AuthTokensDto.user.role` (and
`AuthTokens` in shared-types), so the app can show the admin row. A
session saved before this change has no `role` → treated as a user until
the next token refresh.

## Mobile

| Piece                | Where                                                       | Reads / writes                                      | Notes                                                                                                                                                                                                            |
| -------------------- | ----------------------------------------------------------- | --------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `NewsSheet` (domain) | Início, on open                                             | `GET /changelog/unread`, `POST /changelog/:id/read` | Newest unread; title, "N novas" pill, video card ("Assistir no YouTube" → `expo-web-browser`), text, legacy's "Há mais N…" note; "Fechar" (remembered for this app session only, in memory) / "Marcar como lida" |
| `NewsScreen`         | Mais → "Novidades"                                          | `GET /changelog`, `POST …/read`                     | Cards newest first, "Nova" / "Lida em dd/mm/aaaa", 2-line excerpt; tap → the same sheet                                                                                                                          |
| `AdminNewsScreen`    | Mais → "Gerenciar novidades" (only `user.role === "ADMIN"`) | `GET /admin/changelog`                              | Rows: title, status pill, published / expires, readers, author; "+" → form; tap → edit                                                                                                                           |
| `NewsFormScreen`     | from the admin list                                         | `POST` / `PATCH` / `DELETE /admin/changelog`        | `FormScreen`: title, text (multiline), YouTube link, expiry date (DD/MM/AAAA); on edit, status and delete (via `ConfirmSheet`)                                                                                   |

Início checks unread once per app session (found or not), and only opens
the sheet while Início is on screen; history refreshes on focus and
shows a read at once (optimistic), then invalidates `["changelog"]`.
Mark-read failures show inside the sheet (a toast would sit behind it). Every text is rendered as a plain `Text`. Copy pt-BR;
API errors never shown raw. Full visual spec in `design/telas.md` §30–32.

## Shared types

`packages/shared-types/src/changelog.ts`: `changelogEntrySchema`,
`adminChangelogEntrySchema`, `changelogInputSchema` (form, pt-BR
messages, `youtubeVideoId` shared with the API), `CHANGELOG_STATUSES`.

## Error handling

- Non-admin → 403; the app never shows the admin row/screen to them.
- Mark-read twice → 204 both times.
- Invalid YouTube link → 400 (the form validates first, same function).
