# Tasks — Changelog ("Novidades")

## Shared types

- [x] `packages/shared-types/src/changelog.ts` (+ tests: YouTube id
      extraction, form rules)
- [x] `AuthTokens.user.role`

## API

- [x] `@nestjs/schedule` (^6, Nest 10)
- [x] Prisma: `ChangelogEntry`, `ChangelogRead`, `ChangelogStatus`;
      migration
- [x] `AuthTokensDto.user.role` (+ issueTokens)
- [x] `AdminGuard` (role read from the DB)
- [x] `ChangelogModule`: user controller (unread, history, mark-read),
      admin controller (list, create, update, delete), service
- [x] Visibility builder (active, not expired, published ≥ signup)
- [x] Daily expiry job (`@Cron`, off in tests)
- [x] Swagger on every endpoint; Postman "Changelog" folder with real
      examples
- [x] Unit tests: `youtubeVideoId`, visibility, expiry job, AdminGuard
- [x] E2E: admin publishes → a new user sees it unread → marks read
      (twice) → gone from unread, "Lida" in history; published before
      signup / expired / inactive hidden; non-admin 403 (also with a
      stale ADMIN token after demotion); update/delete; 400s

## Mobile

- [x] Design pass (app-design): `NewsSheet`, cards, admin rows, form;
      `design/telas.md` §30–32, `design/componentes.md`
- [x] `NewsSheet` on Início (session-only "Fechar")
- [x] `NewsScreen` (Mais → "Novidades")
- [x] `AdminNewsScreen` + `NewsFormScreen` (Mais → "Gerenciar
      novidades", admins only)
- [x] Mock API routes + catalog entries
- [x] Unit tests: sheet shows only with unread, "Fechar" vs "Marcar como
      lida", history badges, admin row hidden for users, form validation
- [x] Maestro flow `e2e/flows/changelog.yaml` (the publish → read loop
      needs `MAESTRO_ADMIN_EMAIL`/`MAESTRO_ADMIN_PASSWORD`; not run yet:
      no Maestro CLI on this machine)
- [x] Visual review (≥ 2 rounds)

## Review gates

- [x] `code-reviewer` (startup sheet only on Início and checked once per
      session; mark-read failures shown inside the sheet; `null` on
      required PATCH fields → 400; cron pinned to UTC with its own handler;
      admin "Vencida" on the UTC date)
- [x] `api-contract-guardian` (401 examples, `readCount` as integer)
- [x] `lgpd-security-reviewer` (author name; read tracking) — AdminGuard
      also requires an ACTIVE account; YouTube wording and read retention
      in `product.md`; reads in the export list (`roadmap.md`); the app
      only builds a YouTube link from a valid id
- [x] `performance-auditor` — unread is `{ entry, total }` (not the whole
      list) on every app open; mark-read is optimistic in Novidades and a
      single `INSERT … ON CONFLICT DO NOTHING`
- [x] `qa-engineer` — service spec, guard, 21 e2e cases, admin screen and
      form error tests; Maestro env vars guarded
- [x] Lint + typecheck clean, all tests green
- [x] `workflow-guardian` — commit message(s) drafted
