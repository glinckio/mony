# Roadmap

Each row below is one spec folder in `docs/specs/<feature>/`. Within a
feature, the task order is always **API first, then mobile screen(s),
then you test the integration end-to-end** — see `tech.md` → non-negotiable
rule 4 and every `tasks.md` template. This lets you verify each screen
against a real, working endpoint before moving to the next one, instead of
building the whole API first and the whole app after.

| # | Feature | Status | What it unlocks to test | Depends on |
|---|---|---|---|---|
| 1 | `auth-register` | ✅ Done | Sign-up screen creates a real account | — |
| 2 | `auth-login` | ✅ Done | Login screen authenticates, gets a session | 1 |
| 3 | `auth-password-reset` | ✅ Done | Forgot-password → code → new password, end to end | 2 |
| 4 | `user-profile` | ✅ Done | View/edit profile, change password, switch workspace | 2 |
| 5 | `categories` | ✅ Done | Manage income/expense categories | 2 |
| 6 | `transactions` | ✅ Done | Create/list/edit income & expense entries, recurring batches | 5 |
| 7 | `goals` | ✅ Done | Savings goals with progress tracking | 4 |
| 8 | `dashboard` | ✅ Done | Home screen: totals, balance, monthly chart, goals preview | 6, 7 |
| 9 | `debts` | ✅ Done | Debts with auto-generated installments, payment tracking | 5, 6 |
| 10 | `grocery` | ✅ Done | Household grocery list + informational budget | 2 |
| 11 | `vehicles` | ✅ Done | Vehicle registry, mileage tracking | 2 |
| 12 | `vehicle-maintenance` | ✅ Done | Maintenance types, history, km/date-based alerts | 11 |
| 13 | `subscriptions` | ✅ Done | Plan display + Stripe checkout, status sync | 4 |
| 14 | `reports` | ✅ Done | Charts/aggregations over a date range | 6 |
| 15 | `changelog` | ⬜ Not started | In-app changelog banner + admin CRUD + read tracking | 4 |

Phase 0 (monorepo scaffold) is done. Status detail per feature lives in
that feature's `docs/specs/<feature>/tasks.md` (checkboxes) — this table
is just the at-a-glance summary; update the row here whenever a
feature's tasks.md gets fully checked off. Phase "9"/"10" from the
earlier version of this roadmap (LGPD hardening, full E2E pass, store
submission) still apply **after feature 15** — see "Release hardening"
below.

## Release hardening (after all 15 features)

- Account deletion + personal-data export endpoints (LGPD data-subject
  rights — flagged in `user-profile`'s spec as deferred here, not
  dropped). The DB cascade from `User` does NOT reach object storage:
  after the commit, deletion must sweep `vehicles/{userId}/` — that one
  prefix holds vehicle photos and maintenance receipts
  (`…/{vehicleId}/maintenance/{recordId}/`) — plus a scheduled orphan
  reconciliation, since sweep failures are only logged. The export must
  include vehicles, maintenance types (with descriptions), maintenance
  records (date, mileage, cost, place, notes, type) and the stored files
  (photos and receipts: JPEG as stored, PDF as uploaded).
- Account deletion, Stripe side (subscriptions): before the DB delete,
  `customers.del(stripeCustomerId)` (cancels live subscriptions at once and
  removes saved payment methods), plus any orphan customer found with
  `customers.search({ query: "metadata['userId']:'<id>'" })`. If Stripe
  fails, block the deletion or retry through an outbox — never drop it, or
  the user keeps being billed. Decide the refund/proration policy for the
  unused period. Late webhooks after deletion must stay "unknown customer,
  ignored". The export includes the subscription (plan, status, period
  and trial dates, cancel flag); invoices and the card on file are in the
  Customer Portal.
- Profile → Stripe sync: an email change must reach the Stripe customer
  (`customers.update`, best-effort or via an outbox — LGPD art. 18 §6);
  configure which Customer Portal fields users can edit so the two sides
  don't diverge.
- Production database: set the app role's `plan_cache_mode` to
  `force_custom_plan` (`ALTER ROLE <app_role> SET …`). Prisma reuses
  prepared statements, and after a few
  current-month requests Postgres switches the reports' range queries to
  a generic plan that measured ~6.6× slower on a heavy user's multi-year
  range (performance audit of #14, 2026-09-30).
- Production Stripe config: restricted live key (`rk_live_`: Customers,
  Checkout Sessions, Subscriptions, Billing Portal write; Prices read);
  webhook endpoint on API version `2026-08-26.dahlia` registered for the 6
  handled events only (`checkout.session.completed`,
  `customer.subscription.created|updated|deleted`, `invoice.paid`,
  `invoice.payment_failed`); documented webhook-secret rotation; Checkout
  setting "limit customers to one subscription" on (two Checkout pages
  opened at the very same time can otherwise both be paid).
- Crash/analytics tooling (if added): scrub `req.rawBody` (kept on every
  request since `rawBody: true` — including `/auth/login` passwords),
  request bodies, Stripe payloads and Checkout/Portal URLs.
- Object storage hardening (receipts may carry CPF, address, plate):
  encryption at rest on MinIO (SSE via KES/KMS, or disk encryption);
  bucket versioning off, or a noncurrent-version expiry so deletes really
  erase; documented backup retention for deleted objects.
- Screen capture: consider `FLAG_SECURE` / `expo-screen-capture` so the
  OS app-switcher snapshot doesn't show balances and reports.
- On-device data: on logout and account deletion, clear the app's cache
  directory (picker/manipulator copies) and the image disk cache.
- Privacy policy: cover maintenance receipts (may contain CPF, address,
  plate and third parties' data), their purpose, retention (until the
  record, vehicle or account is deleted) and camera use. Stripe section:
  what we send (email, internal id) and what Stripe collects directly
  (card, holder name), purpose and legal basis (art. 7, V), the transfer
  to the US (art. 33 — check Stripe's DPA against the ANPD standard
  clauses), Stripe as independent controller (and Link), retention; decide
  whether Mony keeps its own billing records for tax purposes (art. 16,
  I). Then link the policy from the subscription screen's notice.
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
- ~~**Mobile charting library** for #8 (`dashboard`) and #14 (`reports`)~~
  — decided: `react-native-gifted-charts`, recorded in `tech.md`; replaced
  by the hand-rolled `YearChart` in the 2026-09 redesign.
