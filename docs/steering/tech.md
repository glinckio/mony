# Tech Steering — Mony

## Stack (fixed — do not change without an explicit decision recorded here)

| Layer | Choice | Why |
|---|---|---|
| Monorepo | pnpm workspaces + Turborepo | Two apps + shared packages, incremental caching |
| Language | TypeScript everywhere | Shared types between API and mobile |
| Backend | NestJS | DI, modules, first-class Swagger, class-validator |
| ORM | Prisma | Versioned migrations, generated types |
| Database | PostgreSQL | Best Prisma support (native enums, JSON, full-text search). Legacy DB is
  MySQL/MariaDB, but the rebuild is a fresh schema (English names, new domain model) — data
  migration is ETL either way, so no real lock-in to the legacy engine |
| Mobile | React Native via **Expo** (managed) | Windows dev machine has no Xcode — Expo Go lets
  iPhone testing happen without a Mac. EAS Build compiles iOS in the cloud for TestFlight/Store
  builds later. Android keeps using the already-configured Android Studio ADB setup. |
| Mobile state | Zustand (UI state) + TanStack Query (server state/cache) | |
| Mobile forms | react-hook-form + zod | |
| Mobile navigation | React Navigation (`@react-navigation/native` + `native-stack` + `bottom-tabs`) | Standard for Expo, works with Expo Go |
| Auth tokens | JWT access (15m) + refresh (30d), Bearer header | Stored in `expo-secure-store` on the client, never AsyncStorage (plain storage isn't safe for tokens) |
| Payment gateway | **Stripe** (confirmed) | Checkout + webhooks for `subscriptions` feature only |
| Object storage | **MinIO** (S3-compatible, self-hosted) | Vehicle photos (`vehicles`) and maintenance receipts (`vehicle-maintenance`), via the AWS S3 SDK (`@aws-sdk/client-s3`) pointed at MinIO's S3-compatible endpoint |
| Transactional email | **Brevo** (`@getbrevo/brevo` Node SDK) | Password reset codes (`auth-password-reset`) — same provider as legacy |
| Mobile charting | TBD — see roadmap open decisions | `dashboard` yearly chart, reused by `reports` |
| UI tokens | `@mony/ui-tokens` (neutral placeholder palette) | No client design yet; swap token values
  only, not component structure, once design assets arrive |
| Unit tests | Jest (both apps) | |
| API integration tests | Jest + Supertest | |
| Mobile E2E | Maestro | Lighter to maintain than Detox, YAML flows |
| CI | GitHub Actions | lint + typecheck + unit tests + build on every PR |
| Git hooks | Husky + lint-staged | lint/typecheck must be clean before push |

## Language policy

Everything in the repository is in **English**: code, identifiers, comments,
commit messages, specs, database table/column names, API error messages.
Chat with the human collaborator may stay in Portuguese; nothing written to
the repo does.

## Commands

```bash
pnpm install            # install all workspaces
pnpm dev                # run api + mobile dev servers (turbo)
pnpm --filter @mony/api dev
pnpm --filter @mony/mobile dev
pnpm lint                # lint all packages
pnpm typecheck
pnpm test                # unit tests, all packages
pnpm --filter @mony/mobile test:e2e   # Maestro flows (needs a running simulator/device)
pnpm --filter @mony/api test:e2e      # Supertest e2e
```

## Known gotchas (don't re-debug these)

- **pnpm workspace settings live in `pnpm-workspace.yaml`, not `.npmrc`.**
  On this pnpm version, `.npmrc` keys like `shamefully-hoist` were silently
  ignored by `pnpm install`; the equivalent (`shamefullyHoist: true`) had
  to go in `pnpm-workspace.yaml` to actually take effect. Verify any new
  install-time setting the same way: check `node_modules/.modules.yaml`
  after a clean install, don't trust `pnpm config get`.
- **`shamefullyHoist: true` is required** for Metro (the RN bundler) to
  resolve transitive deps like `@babel/runtime` across the pnpm
  monorepo — without it, `expo export`/`expo start` fail to resolve
  modules that aren't hoisted to the root `node_modules`.
- **`apps/mobile/metro.config.js`** adds `watchFolders` +
  `nodeModulesPaths` pointing at the monorepo root — required for Metro
  to see workspace packages (`@mony/ui-tokens`, `@mony/shared-types`) and
  the hoisted root `node_modules`.
- **`apps/mobile/jest.config.js`** sets `transformIgnorePatterns: []`
  instead of jest-expo's default pattern. The default regex assumes a
  flat `node_modules` tree; pnpm's nested `.pnpm/<pkg>/node_modules/...`
  store defeats it, so React Native's own Flow-typed internals fail to
  transform and throw a syntax error. Transforming everything is slower
  but reliable in this setup.

## Non-negotiable rules

1. No feature is "done" with failing lint/typecheck/tests.
2. Every new endpoint has Swagger decorators (`@ApiOperation`, `@ApiResponse`
   for every status code it can return) and a matching entry with a real
   example in `docs/postman/collection.json`.
3. Every endpoint validates input via a DTO (`class-validator`) — no
   controller reads `req.body` directly.
4. Every feature follows the SDD flow in `docs/specs/<feature>/` before
   implementation starts (see `_templates/`).
5. Commits are proposed as text (Conventional Commits) — Claude never runs
   `git commit` / `git push` in this repo; the human applies them.
