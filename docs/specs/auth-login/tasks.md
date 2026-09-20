# Tasks — Auth: Login

## API

- [ ] Install `@nestjs/passport`, `passport-jwt`, `@nestjs/jwt`, `@nestjs/throttler`
- [ ] `JwtStrategy` (access token) + `AuthGuard` reusable across all future modules
- [ ] `LoginDto`, `RefreshDto` with validation + `@ApiProperty` examples
- [ ] `AuthService.login()`: lookup by email, `bcrypt.compare`, status check, issue tokens, update `lastAccessAt`
- [ ] `AuthService.refresh()`: verify refresh token, issue new pair
- [ ] `POST /auth/logout` (204, no-op beyond auth check)
- [ ] `ThrottlerModule` global config + throttle on `/auth/login`
- [ ] Swagger decorators on all three endpoints (all status codes)
- [ ] Update `docs/postman/collection.json` with login/refresh/logout examples
- [ ] Unit tests: login success, bad password, unknown email, inactive user, refresh success/failure
- [ ] E2E tests: full login → refresh → logout flow

## Shared types

- [ ] `packages/shared-types/src/auth.ts`: `LoginInput` zod schema

## Mobile

- [ ] `LoginScreen`: form, validation, submit, link to password reset
- [ ] `api-client.ts`: attach `Authorization: Bearer` header, 401 → silent
      refresh-once interceptor, redirect to login on hard failure
- [ ] Unit tests: login form validation, api-client refresh interceptor logic
- [ ] Maestro flow: `e2e/flows/login.yaml` — login with the account created
      in the register flow, assert navigation past the auth stack

## Review gates

- [ ] `lgpd-security-reviewer` — no plaintext password/token logging
- [ ] `code-reviewer`
- [ ] `api-contract-guardian`
- [ ] `performance-auditor` — token verification isn't doing a DB round trip per request beyond what's needed
- [ ] Lint + typecheck clean, all tests green
- [ ] `workflow-guardian` — commit message(s) drafted
