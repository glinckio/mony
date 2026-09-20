# Requirements — Auth: Login

## Summary

Email + password login issuing a JWT access/refresh pair, plus a refresh
endpoint and logout. Blocks inactive accounts, matching legacy's status
gate (adapted: legacy only enforced this inconsistently — web login didn't
check status, the partial API did; the rebuild enforces it consistently at
login).

## User stories

- As a registered user, I want to log in with email and password, so that
  I can access my data.
- As a logged-in user, I want my session to stay valid without re-entering
  my password constantly, so the app should silently refresh my token.
- As a user, I want to log out and have my tokens invalidated client-side.

## Acceptance criteria (EARS)

- WHEN a user submits valid email + password, THE SYSTEM SHALL return an
  access + refresh token pair and update `User.lastAccessAt`.
- IF the email doesn't exist or the password is wrong, THEN THE SYSTEM
  SHALL return a generic 401 "Incorrect email or password." (no
  user-enumeration — matches legacy's generic message).
- IF `User.status != ACTIVE`, THEN THE SYSTEM SHALL return a 403 with a
  message telling the user to contact support (equivalent to legacy's
  "contact admin" redirect, adapted for API/mobile).
- WHEN an access token expires, THE SYSTEM SHALL allow the client to
  exchange a valid, non-expired refresh token for a new access token via
  `POST /auth/refresh`.
- WHEN a user logs out, THE SYSTEM SHALL clear tokens from
  `expo-secure-store` client-side (stateless JWT — no server-side session
  to invalidate, this is a deliberate simplification vs. legacy's PHP
  session).
- IF more than 10 login attempts for the same email arrive within 5
  minutes, THEN THE SYSTEM SHALL return 429 (deliberate hardening —
  legacy had zero rate limiting on login, which we don't want to
  replicate; low-cost with `@nestjs/throttler`).

## Out of scope

- Refresh token rotation/blacklisting (stateless JWT for v1; revisit if a
  "log out all devices" feature is ever requested).

## Open questions

- None blocking.
