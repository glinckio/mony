# Tasks — Changelog

## API

- [ ] Install `@nestjs/schedule`
- [ ] Prisma: `ChangelogEntry`, `ChangelogRead` models, `ChangelogStatus` enum, migration
- [ ] `RolesGuard` (new, reusable for future admin endpoints)
- [ ] `ChangelogModule`, `ChangelogController`, `ChangelogService`
- [ ] `normalizeYoutubeUrl()` pure function
- [ ] Unread query: `publishedAt > user.createdAt AND status=ACTIVE AND
      expiresAt IS NULL OR expiresAt > now() AND NOT EXISTS(ChangelogRead)`
- [ ] Mark-read: idempotent insert
- [ ] `@Cron` job for daily expiry sweep
- [ ] DTOs with validation + `@ApiProperty` examples (description
      sanitized/escaped on render, not trusted as raw HTML — deviation
      from legacy noted in requirements.md)
- [ ] Swagger decorators on all six endpoints
- [ ] Update `docs/postman/collection.json` with examples
- [ ] Unit tests: unread-query correctness (signup-date filter,
      already-read exclusion), idempotent mark-read, YouTube URL
      normalization (both link forms), non-admin 403, cron job flips
      expired entries
- [ ] E2E test: admin creates an entry → new user sees it unread → marks
      read → no longer appears

## Shared types

- [ ] `packages/shared-types/src/changelog.ts`

## Mobile

- [ ] Changelog banner/modal on `DashboardScreen`
- [ ] `AdminChangelogScreen` (role-gated)
- [ ] Unit tests: banner shows only when unread entries exist, admin
      screen hidden for non-admins
- [ ] Maestro flow: `e2e/flows/changelog.yaml` — as admin, publish an
      entry; as a regular user, see and dismiss the banner

## Review gates

- [ ] `lgpd-security-reviewer` — sanitization of admin-authored content rendered to other users
- [ ] `code-reviewer`
- [ ] `api-contract-guardian`
- [ ] Lint + typecheck clean, all tests green
- [ ] `workflow-guardian` — commit message(s) drafted
