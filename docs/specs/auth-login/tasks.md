# Tasks — Auth: Login

## API

- [x] Install `@nestjs/passport`, `passport-jwt`, `@nestjs/jwt`, `@nestjs/throttler`
      (had to pin `@nestjs/passport@^10` — the `@latest` resolved to v12,
      which requires Nest core v11 and we're on v10)
- [x] `JwtStrategy` (access token) + `JwtAuthGuard` reusable across all
      future modules, plus a `@CurrentUser()` param decorator
- [x] `LoginDto`, `RefreshDto` with validation + `@ApiProperty` examples
- [x] `AuthService.login()`: lookup by email, `bcrypt.compare`, status check, issue tokens, update `lastAccessAt`
- [x] `AuthService.refresh()`: verify refresh token, issue new pair
- [x] `POST /auth/logout` (204, no-op beyond auth check)
- [x] `ThrottlerModule` config + `LoginThrottlerGuard` (IP+email tracked)
      scoped to `/auth/login` only — no global `APP_GUARD` (see design.md)
- [x] Swagger decorators on all three endpoints (all status codes)
- [x] Update `docs/postman/collection.json` with login/refresh/logout examples
      (login success/401/403/429 and register are real captured
      responses; refresh's 200 example body uses the real token
      structure with illustrative jti/signature values since it wasn't
      captured live — the shape is verified correct by the e2e suite)
- [x] Unit tests: login success, bad password, unknown email, inactive user, refresh success/failure
- [x] E2E tests: full login → refresh → logout flow, plus rate-limit test

## Shared types

- [x] `packages/shared-types/src/auth.ts`: `LoginInput` zod schema

## Mobile

- [x] `LoginScreen`: form, validation, submit, link to `RegisterScreen`
      ("esqueci minha senha" deferred — `auth-password-reset` doesn't
      exist yet, not linking to a screen that isn't there)
- [x] `api-client.ts`: attaches `Authorization: Bearer` header, 401 →
      silent refresh-once interceptor (coalesces concurrent 401s into one
      refresh call), clears session on hard failure so the auth stack
      takes over automatically
- [x] Unit tests: login form validation, api-client refresh interceptor logic
- [x] Maestro flow: `e2e/flows/login.yaml` — register → logout → login
      round trip (uses `evalScript` to reuse the generated email across
      both steps); fixed `register.yaml` too, since `Login` is now the
      initial unauthenticated route instead of `Register`
- [x] Added a "Sair" (logout) button to `HomeScreen` and a
      login↔register cross-link on both auth screens — not originally
      scoped, added so the auth loop is actually testable end to end
- [x] Fixed a real UI bug found during review: `LoginScreen` used
      `Screen centered`, which fights the keyboard-open animation on
      focus (content re-centers as available height shrinks). Removed;
      documented the composition rule in `design-system.md`.

## Review gates

- [x] `lgpd-security-reviewer` — no plaintext password/token logging
      anywhere in the auth module; login rate-limited by IP+email
- [x] `code-reviewer` — found and fixed: identical access/refresh tokens
      when issued within the same second (JWT determinism — added a
      `jti` claim), and a double-throttling setup where the global guard
      and the login-specific guard both read the same `@Throttle`
      override (removed the global guard, login-only is what the spec
      actually asked for)
- [x] `api-contract-guardian` — Swagger covers every status code per
      endpoint; Postman collection updated (see note above)
- [x] `performance-auditor` — confirmed `JwtStrategy.validate()` does zero
      DB lookups (claims embedded in the token); `login`/`refresh` each do
      the minimum necessary queries (1–2)
- [x] Lint + typecheck clean, all tests green (unit + e2e, API and mobile)
- [x] `workflow-guardian` — commit message(s) drafted below
