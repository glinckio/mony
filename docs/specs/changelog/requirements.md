# Requirements — Changelog ("Novidades")

## Summary

Legacy's "atualizações do sistema" (`funcoes_atualizacoes.php`,
`dashboard.php`, `historico_atualizacoes.php`,
`gerenciar_atualizacoes.php`): admins publish short announcements; each
user sees, on opening the app, the newest one they haven't read (with how
many are waiting), can mark it read, and can browse them all in a history.
The legacy dump has no entries, so there is nothing to import.

Owner decisions (2026-09-30):

- **The Início announcement as legacy:** opens by itself with the newest
  unread entry and "N novas"; "Fechar" only closes it (it shows again the
  next time the app is opened); "Marcar como lida" ends it. (The earlier
  draft of this spec had oldest-first and "dismiss = read" — both differ
  from legacy.)
- **Video as a "Assistir" button** that opens YouTube in the in-app
  browser. Nothing is embedded or fetched from YouTube until the user taps
  (no thumbnail either: that would send every user's IP to YouTube just
  for opening the app).
- **Admin screens in the app** (the web product is gone): Mais →
  "Gerenciar novidades", only for `role=ADMIN`.
- **Plain text** descriptions (paragraphs and line breaks). Legacy stored
  raw TinyMCE HTML and printed it unescaped — a stored-XSS vector; the app
  renders text only.

Also new vs legacy: the expiry sweep actually runs (daily job;
`product.md` → decisions), and the admin role is checked against the
database on every admin request.

## User stories

- As a user, when there's news I haven't read, I want to see it when I
  open the app, and mark it read or leave it for later.
- As a user, I want a list of all the news, to read again or catch up.
- As an admin, I want to publish, edit, deactivate and delete news, and
  see how many people read each one.

## Acceptance criteria (EARS)

Visibility (legacy's rule): an entry is visible to a user WHEN it is
active, its expiry date is empty or not before today, and it was
published at or after the user signed up.

- WHEN the app asks for the user's unread entries, THE SYSTEM SHALL return
  the newest visible entry the user hasn't read and how many there are.
- WHEN the Início screen opens and there are unread entries, THE APP SHALL
  show the newest one (title, "N novas" when more than one, the video
  button when there's a video, the text, and — when more are waiting —
  legacy's "Há mais N atualizações não lidas…" note), with "Fechar" and
  "Marcar como lida".
- WHEN the user taps "Fechar", THE APP SHALL not show it again until the
  app is opened again; nothing is recorded.
- WHEN the user marks an entry read, THE SYSTEM SHALL record it once
  (idempotent) and the next unread one (if any) appears the next time.
- IF the entry isn't visible to the user, THEN marking it read SHALL
  answer 404.
- WHEN the user opens "Novidades", THE SYSTEM SHALL list every visible
  entry, newest first, each with "Nova" or "Lida em dd/mm/aaaa"; opening
  one shows it in full, with "Marcar como lida" when unread.
- WHEN an admin lists the entries, THE SYSTEM SHALL return all of them
  (any status, expired or not), newest first, with the publication and
  expiry dates, status, number of readers and the author's name.
- WHEN an admin creates an entry (title, text, optional YouTube link,
  optional expiry date), THE SYSTEM SHALL publish it now, active, with the
  admin as author.
- WHEN an admin edits an entry, THE SYSTEM SHALL update title, text,
  video, expiry date and status (the publication date doesn't change).
- WHEN an admin deletes an entry, THE SYSTEM SHALL delete it and its read
  records (the app confirms first).
- IF the caller isn't an admin (checked in the database, not only the
  token), THEN every admin endpoint SHALL answer 403.
- THE SYSTEM SHALL accept only YouTube links (`youtube.com/watch?v=`,
  `youtu.be/`, `youtube.com/shorts/`, `youtube.com/embed/`) and store
  the video id; anything else is a 400.
- THE SYSTEM SHALL run a daily job that sets `INACTIVE` every active entry
  whose expiry date has passed (legacy's `limparAtualizacoesExpiradas`,
  never called there).
- THE APP SHALL render titles and text as plain text only.

## Out of scope

- Push notifications for new entries.
- Rich text / markdown, images.
- Scheduling a future publication date (legacy publishes on save).

## Open questions

- None blocking.
