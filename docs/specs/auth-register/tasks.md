# Tasks — Auth: Register

## API

- [x] Add Prisma to `apps/api` (`@prisma/client`, `prisma` dev dep), init
      `prisma/schema.prisma` pointed at `DATABASE_URL` (Postgres)
- [x] Prisma schema: `User`, `Role`, `UserStatus`, `WorkspaceType` (see design.md)
- [x] First migration (`prisma migrate dev`)
- [x] `AuthModule`, `AuthService`, `AuthController`
- [x] `RegisterDto` with class-validator decorators + `@ApiProperty` examples
- [x] `register()`: uniqueness check, bcrypt hash, create user, issue tokens
- [x] JWT module setup (access 15m / refresh 30d, from `.env`)
- [x] Swagger decorators on `POST /auth/register` (all status codes)
- [x] Update `docs/postman/collection.json` with a real register example
- [x] Unit tests: `AuthService.register` (success, duplicate email, hash called)
- [x] E2E test: `POST /auth/register` happy path + duplicate email 409

## Shared types

- [x] `packages/shared-types/src/auth.ts`: `RegisterInput` zod schema, `AuthTokens` type

## Mobile

- [x] Install `@react-navigation/native` + `native-stack`, `expo-secure-store`,
      `react-hook-form`, `zod`, `@hookform/resolvers`
- [x] `lib/api-client.ts`: base fetch wrapper reading `EXPO_PUBLIC_API_URL`
- [x] `lib/auth-store.ts`: Zustand store for tokens (persisted via `expo-secure-store`)
- [x] `RegisterScreen`: form, validation, submit, error states
- [x] Unit test: form validation (mismatched passwords, invalid email)
- [x] Maestro flow: `e2e/flows/register.yaml` — authored; not yet run against a
      real device/simulator (none available in the dev sandbox) — run this on
      your iPhone/Android setup before considering the flow verified

## Review gates

- [x] `lgpd-security-reviewer` — password hashed (bcryptjs, cost 12), never
      logged; token response only returns id/name/email/workspace, no
      over-fetching
- [x] `code-reviewer` — found and fixed: missing `PrismaService` shutdown
      hook wiring in `main.ts`, empty-string `phone` incorrectly rejected
      by validation (fixed both API DTO and mobile zod schema, regression
      tests added)
- [x] `api-contract-guardian` — Swagger covers 201/400/409; Postman example
      captured from a real running server, not hand-typed
- [x] Lint + typecheck clean, all tests green (unit + e2e, API and mobile)
- [x] `workflow-guardian` — commit message(s) drafted below
