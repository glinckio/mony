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

`JwtStrategy` (Passport, reads `JWT_ACCESS_SECRET`) validates the access
token's signature/expiry and returns its claims — `sub`, `email`, `role`,
`activeWorkspace` are embedded directly in the signed payload at
issuance, so this never does a DB lookup. `JwtAuthGuard` wraps it for
`@UseGuards()`; a `@CurrentUser()` param decorator extracts
`request.user`. Both are reusable as-is by every authenticated endpoint
from here on — documented once, not repeated per-feature.

`ThrottlerModule.forRoot([...])` registers the storage/config (10
req/5min), but there's **no global `APP_GUARD`** — only `/auth/login`
applies a guard (`LoginThrottlerGuard`, tracked by IP+email combined, not
just IP). A blanket global rate limit is a separate decision for later,
not bundled in here.

`/auth/logout` is a no-op on the server beyond returning 204 (stateless
JWT) — exists as an endpoint mainly so the client has one consistent call
to make and so a future server-side revocation list has a natural home.

## Mobile screens

Built from `docs/steering/design-system.md`'s component library, same as
`auth-register`. **Not centered** — see that doc's `Screen` entry: a form
screen with text inputs must stay top-aligned, `centered` makes the
content's position fight the keyboard-open animation.

| Screen | Route | Reads | Writes | Notes |
|---|---|---|---|---|
| `LoginScreen` | `/login` | — | `POST /auth/login` | Email, password, link to `RegisterScreen`. "Esqueci minha senha" link deferred to `auth-password-reset` (feature 3) — not added yet, don't link to a screen that doesn't exist. |
| `RegisterScreen` (extends `auth-register`) | `/register` | — | — | Added a matching "Já tem uma conta? Entrar" link back to `LoginScreen`, now that it exists. |
| `HomeScreen` (extends `auth-register`'s placeholder) | `/` | — | `POST /auth/logout` | Added a "Sair" button (`api-client`'s `logout()` helper) — wasn't in scope originally, added so there's a way back to the auth stack to actually test login without reinstalling the app. |
| — (app shell) | — | — | `POST /auth/refresh` | `api-client` interceptor: on 401 with an expired access token, silently try refresh once before failing the original request; if refresh also fails, clears the session so the auth stack takes over. |

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
