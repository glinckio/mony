# Tasks — Auth: Register

## API

- [ ] Add Prisma to `apps/api` (`@prisma/client`, `prisma` dev dep), init
      `prisma/schema.prisma` pointed at `DATABASE_URL` (Postgres)
- [ ] Prisma schema: `User`, `Role`, `UserStatus`, `WorkspaceType` (see design.md)
- [ ] First migration (`prisma migrate dev`)
- [ ] `AuthModule`, `AuthService`, `AuthController`
- [ ] `RegisterDto` with class-validator decorators + `@ApiProperty` examples
- [ ] `register()`: uniqueness check, bcrypt hash, create user, issue tokens
- [ ] JWT module setup (access 15m / refresh 30d, from `.env`)
- [ ] Swagger decorators on `POST /auth/register` (all status codes)
- [ ] Update `docs/postman/collection.json` with a real register example
- [ ] Unit tests: `AuthService.register` (success, duplicate email, hash called)
- [ ] E2E test: `POST /auth/register` happy path + duplicate email 409

## Shared types

- [ ] `packages/shared-types/src/auth.ts`: `RegisterInput` zod schema, `AuthTokens` type

## Mobile

- [ ] Install `@react-navigation/native` + `native-stack`, `expo-secure-store`,
      `react-hook-form`, `zod`, `@hookform/resolvers`
- [ ] `lib/api-client.ts`: base fetch wrapper reading `EXPO_PUBLIC_API_URL`
- [ ] `lib/auth-store.ts`: Zustand store for tokens (persisted via `expo-secure-store`)
- [ ] `RegisterScreen`: form, validation, submit, error states
- [ ] Unit test: form validation (mismatched passwords, invalid email)
- [ ] Maestro flow: `e2e/flows/register.yaml` — fill form, submit, assert
      navigation to authenticated stack

## Review gates

- [ ] `lgpd-security-reviewer` — email/phone/password handling
- [ ] `code-reviewer`
- [ ] `api-contract-guardian`
- [ ] Lint + typecheck clean, all tests green
- [ ] `workflow-guardian` — commit message(s) drafted
