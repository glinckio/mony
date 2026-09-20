# Roadmap

Each row below is one spec folder in `docs/specs/<feature>/`. Within a
feature, the task order is always **API first, then mobile screen(s),
then you test the integration end-to-end** — see `tech.md` → non-negotiable
rule 4 and every `tasks.md` template. This lets you verify each screen
against a real, working endpoint before moving to the next one, instead of
building the whole API first and the whole app after.

| # | Feature | What it unlocks to test | Depends on |
|---|---|---|---|
| 1 | `auth-register` | Sign-up screen creates a real account | — |
| 2 | `auth-login` | Login screen authenticates, gets a session | 1 |
| 3 | `auth-password-reset` | Forgot-password → code → new password, end to end | 2 |
| 4 | `user-profile` | View/edit profile, change password, switch workspace | 2 |
| 5 | `categories` | Manage income/expense categories | 2 |
| 6 | `transactions` | Create/list/edit income & expense entries, recurring batches | 5 |
| 7 | `goals` | Savings goals with progress tracking | 4 |
| 8 | `dashboard` | Home screen: totals, balance, monthly chart, goals preview | 6, 7 |
| 9 | `debts` | Debts with auto-generated installments, payment tracking | 5, 6 |
| 10 | `grocery` | Household grocery list + informational budget | 2 |
| 11 | `vehicles` | Vehicle registry, mileage tracking | 2 |
| 12 | `vehicle-maintenance` | Maintenance types, history, km/date-based alerts | 11 |
| 13 | `subscriptions` | Plan display + Stripe checkout, status sync | 4 |
| 14 | `reports` | Charts/aggregations over a date range | 6 |
| 15 | `changelog` | In-app changelog banner + admin CRUD + read tracking | 4 |

Phase 0 (monorepo scaffold) is already done. Phase "9"/"10" from the
earlier version of this roadmap (LGPD hardening, full E2E pass, store
submission) still apply **after feature 15** — see "Release hardening"
below.

## Release hardening (after all 15 features)

- Account deletion + personal-data export endpoints (LGPD data-subject
  rights — flagged in `user-profile`'s spec as deferred here, not
  dropped).
- Full LGPD review pass (`lgpd-security-reviewer`) across the whole app.
- Full Maestro E2E suite run together (not just per-feature flows).
- Performance audit pass (`performance-auditor`) end to end.
- Internal beta: TestFlight (needs Apple Developer Program membership) +
  Android internal testing track.
- Store submission prep (icons, screenshots, privacy policy, listing).

## Backlog (not scheduled — revisit after the core app is stable)

- **Bank statement import** (generic CSV, Nubank fatura, Inter fatura).
  Backend is cheap (same "bulk insert expenses" logic three times over in
  the legacy code); the real work is column-mapping/installment-detection
  UI, which is worth redesigning for React Native rather than porting the
  legacy client-side JS 1:1. Needs its own spec when scheduled.
- Anything resembling the legacy "Universidade" content pages — dropped,
  no backing data model, revisit only if the client explicitly asks for a
  content/education section.

## Confirmed decisions

- **Payment gateway**: Stripe, for #13 (`subscriptions`).
- **Object storage**: MinIO (S3-compatible, self-hosted), for #11
  (`vehicles` photo) and #12 (`vehicle-maintenance` receipts) — via
  `@aws-sdk/client-s3` against MinIO's S3-compatible endpoint. Needs a
  running MinIO instance + bucket + credentials in `.env`
  (`MINIO_ENDPOINT`, `MINIO_ACCESS_KEY`, `MINIO_SECRET_KEY`,
  `MINIO_BUCKET`) before #11 implementation starts.
- **Transactional email**: Brevo (`@getbrevo/brevo` Node SDK), for
  #3 (`auth-password-reset`) — same provider as legacy. Needs a Brevo API
  key in `.env` (`BREVO_API_KEY`) before #3 implementation starts.

## Open decisions (need the client/owner's input before the relevant phase)

- **Apple Developer Program membership** — not required for Expo Go dev
  testing, only before the TestFlight step in Release hardening.
- **Mobile charting library** for #8 (`dashboard`) and #14 (`reports`) —
  not chosen yet (candidates: `victory-native`, `react-native-gifted-charts`).
  Pick during `dashboard` implementation, record the choice in `tech.md`,
  `reports` just reuses it.
