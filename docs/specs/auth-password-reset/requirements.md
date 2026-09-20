# Requirements — Auth: Password Reset

## Summary

Code-based password reset (matches legacy exactly, not a magic link): user
requests a code by email, gets a 6-digit code valid for 1 hour, submits it
plus a new password.

## User stories

- As a user who forgot their password, I want to request a reset code by
  email, so that I can regain access without contacting support.
- As a user, I want to enter the code and set a new password in one flow.

## Acceptance criteria (EARS)

- WHEN a user requests a reset for an email, THE SYSTEM SHALL generate a
  6-digit numeric code, store it with a 1-hour expiry, invalidate any
  prior unused code for that user, and email it.
- IF the email doesn't correspond to a registered user, THEN THE SYSTEM
  SHALL still return a generic success response ("if this email is
  registered, you'll receive a code") — no enumeration, matches legacy.
- WHEN a user submits a code, THE SYSTEM SHALL accept it only if it
  matches, is unexpired, and unused; otherwise return 400 "Invalid or
  expired code."
- WHEN a valid code is submitted together with a new password (+
  confirmation), THE SYSTEM SHALL update the password hash, mark the code
  used, and invalidate it for reuse — in one request (deviation from
  legacy's two-step session-flag dance: mobile does this as a single
  `POST /auth/reset-password` call with `{email, code, newPassword}`,
  simpler and equally secure since the code itself is the proof).
- THE SYSTEM SHALL enforce the same password rules as registration (min 8
  chars).

## Out of scope

- SMS-based reset (email only, matches legacy).

## Open questions

- None blocking. Email delivery provider confirmed: Brevo
  (`@getbrevo/brevo`), same as legacy — see `design.md`.
