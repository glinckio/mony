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
| Mobile | React Native via **Expo SDK 57** (managed) | Windows dev machine has no Xcode — Expo Go lets
  iPhone testing happen without a Mac. EAS Build compiles iOS in the cloud for TestFlight/Store
  builds later. Android keeps using the already-configured Android Studio ADB setup. SDK pinned
  to whatever the current stable `latest` tag is — Expo Go only supports the current/near-current
  SDK, so this needs bumping again if Expo Go stops loading the app (see gotchas below for the
  upgrade recipe). |
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

**Codebase = English. App UI = Portuguese (pt-BR).** Full explanation and
rationale in `CLAUDE.md` → Language — this is the short version:

- English: code, identifiers, comments, commit messages, specs, DB
  table/column names, API error messages (`class-validator`, Swagger,
  Postman).
- Portuguese: every string in `apps/mobile` a user sees (labels, buttons,
  placeholders, toasts, validation messages) — including the zod
  validation messages in `packages/shared-types`, since those render as
  inline form errors in the app.
- The mobile app never shows a raw API `message` string to the user —
  it maps known error cases to its own pt-BR copy and falls back to a
  generic pt-BR message otherwise.

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

- **Metro's Metro config (`unstable_enablePackageExports`) can misresolve
  packages in a pnpm monorepo**, surfacing as a generic
  `Cannot read property 'default' of undefined` at runtime (native only —
  it didn't reproduce when the same bundle was loaded via `expo start
  --web`, which was the fastest way to confirm the JS bundle itself was
  fine and the problem was resolution-strategy-specific). Disabled in
  `apps/mobile/metro.config.js` until every dependency's `exports` map is
  verified clean against Metro's implementation.
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
- **Upgrading the Expo SDK**: `cd apps/mobile && npx expo install expo@^<major>.0.0 && npx expo install --fix`,
  then `pnpm add -D @testing-library/react-native@latest test-renderer@^1.0.0 --filter @mony/mobile`
  (see next two bullets for why both are needed), then **fully remove and
  reinstall `node_modules` from the repo root** — a partial/incremental
  install after a major RN bump has repeatedly left stale/duplicate
  package instances in the pnpm store on Windows (once traced to an
  `EPERM` mid-install file-rename failure that silently corrupted one
  package's install state) that cause bizarre, hard-to-diagnose test
  failures. Don't debug a weird post-upgrade test failure without first
  trying a clean reinstall.
- **`@testing-library/react-native` v14 requires the `test-renderer`
  npm package** (not the deprecated `react-test-renderer`) and its
  `render()` is now **async**. Symptom if you miss either: `render()`
  silently resolves to a pending `Promise` instead of a result object,
  and `screen.getByText(...)` throws `` `render` function has not been
  called `` even though render clearly ran. Fix: `await render(<X />)`
  in every test, and make sure `test-renderer` is installed.
- **TypeScript 6 deprecates `baseUrl`-based path mapping and
  `moduleResolution: "Node"`.** Workspace package resolution (`@mony/*`)
  doesn't need `baseUrl`/`paths` at all — pnpm's own `node_modules`
  linking already resolves it, so those blocks were just deleted from
  `apps/mobile/tsconfig.json`. NestJS still needs classic `Node`
  resolution (CommonJS decorator metadata isn't compatible with
  `Node16`/`NodeNext` without a larger migration), so `tsconfig.nest.json`
  silences the deprecation explicitly via `"ignoreDeprecations": "6.0"`
  rather than changing resolution strategy.
- **TS 6 also stopped auto-including `@types/*` packages** in some
  configs that used to pick them up implicitly (`shared-types` and
  `api` both needed an explicit `"types": ["jest"]` /
  `"types": ["node", "jest"]` added once TS 6 landed) — if a
  package's tests suddenly can't find `describe`/`it`/`expect`, check
  this first before reaching for `@types/jest` reinstalls.
- **`apps/api/tsconfig.build.json`**: TS 6 also requires an explicit,
  unambiguous `rootDir` once `outDir` is set (`TS5011`), but `apps/api`'s
  main `tsconfig.json` intentionally includes both `src/` and `test/` (so
  ts-jest and the editor see both). Setting `rootDir` to the project root
  there satisfies that check, but would make `nest build` emit to
  `dist/src/main.js` instead of `dist/main.js` — so a separate
  `tsconfig.build.json` (rootDir `./src`, excludes `test/`+`*.spec.ts`)
  is what `nest build` actually uses, keeping `dist/main.js` flat. This
  is the standard Nest CLI convention, not a one-off hack.

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
