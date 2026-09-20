# Requirements — Changelog

## Summary

Admin-authored in-app changelog entries; users see unread ones (published
after their signup date) as a banner and can mark them read. Adds a real
scheduled job for auto-expiring entries — legacy had the function but
never wired it to a scheduler (see `product.md`).

## User stories

- As an admin, I want to publish changelog entries with a title,
  description, optional video, and optional expiry date.
- As a user, I want to see unread updates published since I signed up,
  and dismiss/mark them read.

## Acceptance criteria (EARS)

- WHEN a user requests unread entries, THE SYSTEM SHALL return active,
  non-expired entries published after that user's `createdAt`, that have
  no matching `ChangelogRead` row for them — ordered oldest-unread-first
  (matches legacy: the UI shows the first one).
- WHEN a user marks an entry read, THE SYSTEM SHALL insert a
  `ChangelogRead` row (idempotent — no-op if one already exists).
- IF the requester is not `role=ADMIN`, THEN THE SYSTEM SHALL reject
  create/update/delete on changelog entries with 403.
- THE SYSTEM SHALL normalize a submitted YouTube URL (both
  `youtube.com/watch?v=` and `youtu.be/` short-link forms) to an embeddable
  format on save.
- THE SYSTEM SHALL run a daily scheduled job that flips `status=INACTIVE`
  for any entry whose `expiresAt` has passed (this is new — legacy's
  equivalent function existed but nothing ever called it).

## Out of scope

- Rich-text/WYSIWYG editing — plain text/markdown description is
  sufficient (legacy allowed raw unsanitized HTML from the admin form,
  which is a stored-XSS risk if ever rendered to non-admin users without
  sanitizing; the rebuild sanitizes/escapes on render instead of trusting
  admin input verbatim).

## Open questions

- None blocking.
