# Design — Auth: Login

## Data model (Prisma)

No schema changes — uses `User` from `auth-register`.

## API surface

| Method | Path | Auth | Request DTO | Response DTO | Error cases |
|---|---|---|---|---|---|
| POST | `/auth/login` | none (throttled) | `LoginDto` | `AuthTokensDto` | 400 validation, 401 bad credentials, 403 inactive, 429 rate-limited |
| POST | `/auth/refresh` | none | `RefreshDto` | `AuthTokensDto` | 400 validation, 401 invalid/expired refresh token |
| POST | `/auth/logout` | Bearer | — | 204 | 401 |

`LoginDto`: `{ email: string; password: string }`.
`RefreshDto`: `{ refreshToken: string }`.

`AuthGuard` (Passport JWT strategy) reads `JWT_ACCESS_SECRET`, attaches
`request.user = { id, email, role, activeWorkspace }`. Every
authenticated endpoint from here on in the roadmap uses this guard —
documented once, not repeated per-feature.

`ThrottlerModule` (global, `@nestjs/throttler`): default 10 req/5min per
IP+email combination on `/auth/login`.

`/auth/logout` is a no-op on the server beyond returning 204 (stateless
JWT) — exists as an endpoint mainly so the client has one consistent call
to make and so a future server-side revocation list has a natural home.

## Mobile screens

| Screen | Route | Reads | Writes | Notes |
|---|---|---|---|---|
| `LoginScreen` | `/login` | — | `POST /auth/login` | Email, password, "esqueci minha senha" link → `auth-password-reset` flow (feature 3) |
| — (app shell) | — | — | `POST /auth/refresh` | `api-client` interceptor: on 401 with an expired access token, silently try refresh once before failing the original request |

## Shared types

`packages/shared-types/src/auth.ts` (extend from register): `LoginInput`
zod schema, reuse `AuthTokens`.

## Error handling

- Bad credentials → single generic inline error under the password field,
  never "email not found" vs "wrong password" separately (no enumeration).
- 403 inactive → full-screen message with a support contact link, not a
  toast (user is blocked, needs a clear next step).
- 429 → "Too many attempts, try again in a few minutes."
- Refresh failure (both tokens invalid/expired) → clear stored tokens,
  redirect to `LoginScreen`.
