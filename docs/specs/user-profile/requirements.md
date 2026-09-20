# Requirements — User Profile

## Summary

View and edit profile (name, email, phones), change password (a real
implementation — legacy's version was a dead stub, see
`docs/steering/product.md`), and switch the active workspace
(personal/business).

## User stories

- As a user, I want to view and edit my name, email, and phone numbers.
- As a user, I want to change my password from within the app, providing
  my current password.
- As a user, I want to switch between my personal and business workspace,
  and have that choice apply everywhere in the app.

## Acceptance criteria (EARS)

- WHEN a user requests their profile, THE SYSTEM SHALL return `name`,
  `email`, `phone`, `phone2`, `activeWorkspace`, `createdAt`, `lastAccessAt`.
- WHEN a user updates `name`/`phone`/`phone2`, THE SYSTEM SHALL validate
  and persist them (phone: digits only, 10–11 digits if provided).
- IF a user changes `email` to one already used by another account, THEN
  THE SYSTEM SHALL reject with 409.
- WHEN a user submits current password + new password + confirmation, THE
  SYSTEM SHALL verify the current password before updating — reject with
  401 if it's wrong.
- WHEN a user switches `activeWorkspace`, THE SYSTEM SHALL persist it on
  `User` and every subsequent Transaction/Debt/Goal request for that user
  filters by the new value.

## Out of scope

- Profile photo/avatar (not in legacy).
- Deleting the account from this screen — LGPD requires *a* path to
  delete/export personal data eventually (see `product.md` LGPD section),
  but it's tracked as a release-hardening task, not bundled into this
  feature, to keep this spec focused.

## Open questions

- None blocking.
