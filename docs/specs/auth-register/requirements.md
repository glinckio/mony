# Requirements — Auth: Register

## Summary

Standalone sign-up flow: a new user creates an account with name, email,
password, and optional phone — independent of any payment step (deviation
from legacy, see `docs/steering/product.md`).

## User stories

- As a visitor, I want to create an account with my name, email, and
  password, so that I can start using Mony.
- As a visitor, I want clear feedback when my email is already registered,
  so that I know to log in instead.

## Acceptance criteria (EARS)

- WHEN a visitor submits name, email, password, and password confirmation,
  THE SYSTEM SHALL create a `User` with a bcrypt-hashed password and
  default `role=USER`, `status=ACTIVE`.
- IF the submitted email already exists, THEN THE SYSTEM SHALL reject the
  request with a 409 and the message "This email is already registered."
  (no other user-enumeration detail).
- IF password and confirmation don't match, THEN THE SYSTEM SHALL reject
  with a 400 validation error.
- WHEN registration succeeds, THE SYSTEM SHALL return an access token +
  refresh token pair, so the app can log the user in immediately without a
  second round trip.
- THE SYSTEM SHALL require: `name` (1–100 chars), `email` (valid format,
  max 100 chars), `password` (min 8 chars — stricter than legacy's 6, this
  is a deliberate improvement), `phone` (optional, digits only, 10–11
  digits if provided).

## Out of scope

- Email verification (not in legacy, not requested — flag as a future
  enhancement, not built now).
- Social login (Google/Apple) — not requested.

## Open questions

- None blocking. Email verification could be a fast-follow if the client
  wants it later.
