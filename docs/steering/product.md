# Product Steering — Mony

## Mission

Mony is a personal finance app (originally a PHP web app, being rebuilt as a
NestJS API + React Native mobile app). The client no longer wants a web
product — mobile only, backed by a proper API.

## Domain glossary (legacy PT-BR table → English domain term)

Translated from the legacy schema in `legacy_php_reference/u676707464_monitorizze.sql`.
All new code, database schema, specs and docs use the English names below —
the legacy names only exist for cross-referencing during migration.

| Legacy table (PT-BR) | English domain concept | Notes |
|---|---|---|
| `usuarios` | `User` | name, email, phone(s), password hash, role, status |
| `transacoes` | `Transaction` | income/expense entries |
| `categorias` | `Category` | transaction categorization |
| `dividas` | `Debt` | a debt the user owes |
| `dividas_parcelas` | `DebtInstallment` | installments of a `Debt` |
| `metas` | `Goal` | savings/financial goals |
| `itens_mercado` | `GroceryItem` | grocery/shopping list item |
| `orcamento_mercado` | `GroceryBudget` | monthly grocery budget |
| `veiculos` | `Vehicle` | user-owned vehicle |
| `tipos_manutencao` | `MaintenanceType` | catalog of maintenance kinds |
| `manutencoes_realizadas` | `VehicleMaintenance` | maintenance history entry |
| `alertas_manutencao` | `MaintenanceAlert` | mileage/date based alert |
| `assinaturas` | `Subscription` | user's plan/subscription |
| `atualizacoes` | `ChangelogEntry` | in-app changelog/announcement |
| `atualizacoes_leituras` | `ChangelogRead` | read receipt per user |
| `codigos_recuperacao` | `PasswordResetCode` | password recovery code |

## Sensitive data (LGPD scope)

`User` (name, email, phone) and `Subscription` (last 4 card digits, card
brand) hold personal data under Brazil's LGPD. Financial records
(`Transaction`, `Debt`, `Goal`) are also personal data once linked to a
`User`. See [`lgpd-security-reviewer`](../../.claude/agents/lgpd-security-reviewer.md)
— it must review any phase that touches these entities.

Hard rule: never store raw card numbers. `Subscription` payment handling
goes through Stripe (tokenizing gateway, confirmed — see `tech.md`).

### Data sharing with third parties

- **Stripe** — receives payment/card details for `Subscription` checkout;
  tokenizes, never touches our DB (see above).
- **Brevo** — receives the user's email address (plus name, once used in
  templates) to deliver transactional email: currently the
  `auth-password-reset` 6-digit code. See `tech.md` and `roadmap.md` for
  the API key/config.

## Workspaces (personal vs. business)

The legacy app has an in-session toggle between two "workspaces" —
`pessoal` (personal) and `empresarial` (business) — implemented as a single
enum column stamped on `Transaction`, `Debt`, and `Goal` rows, filtered on
everywhere. **Not** a real multi-tenant business entity (no company record,
no members) — just a partition switch so a user can keep personal and
business-ish spending separate within one account.

**Decision: kept as-is** (`WorkspaceType`: `PERSONAL` | `BUSINESS`), per
explicit instruction not to change this rule during the rebuild. Every
`Transaction`, `Debt`, and `Goal` endpoint filters by the caller's active
workspace; the mobile app has a workspace switcher (see `user-profile`
spec). Category and Vehicle are NOT workspace-scoped in the legacy app —
keep them global to the user.

## Legacy behavior — decisions for the rebuild

Extracted from a full read of `legacy_php_reference/_public_html/app/`.
Where legacy behavior was inconsistent, dead, or clearly a bug, the
decision here is authoritative — specs must follow this, not silently
replicate the bug.

| Area | Legacy behavior | Rebuild decision |
|---|---|---|
| CSRF | None anywhere (plain POST forms) | N/A — mobile app uses Bearer JWT, not cookies, so classic CSRF doesn't apply. No token needed. |
| Registration | Only reachable after a Stripe checkout session (`registro-pos-pagamento.php`); no plain sign-up | **Standalone signup flow**, independent of payment — this is explicitly requested for the rebuild. |
| Profile password change | Form exists, handler is an empty stub — never worked | **Implement for real**: current password + new password, verified server-side. |
| Debt `interestRate` | Captured on the model but never applied — installments are always flat/equal division. A separate amortization simulator exists but isn't wired to real debt creation | **Keep flat division only.** Store `interestRate` as informational metadata; no amortization math in this rebuild. |
| Despesa (expense) totals in Reports vs. Dashboard | Dashboard/transaction summaries filter expenses to `status=PAID`; Reports sums ALL expenses regardless of status (inconsistency/bug) | **Standardize on `status=PAID`-only everywhere**, including Reports. |
| Grocery budget | Purely informational — never enforced as a hard cap | Keep informational only; no server-side block on exceeding it. |
| Subscription plans | Two plans (monthly/annual), identical feature lists in both — no code-level feature gating found anywhere; payments are currently fully disabled | **No tiered feature gating** in this rebuild either. Subscription status is tracked and shown; it does not currently unlock/restrict anything. Revisit only if the client asks. |
| Dashboard alert widgets | Debt-due-soon and maintenance-due functions exist but are never surfaced on the dashboard | Keep matching legacy — **not** added to the dashboard in this rebuild. Can be revisited later as a deliberate enhancement, not a migration task. |
| Changelog auto-expiry (`limparAtualizacoesExpiradas`) | Function exists, intended to flip expired entries to inactive, but nothing ever calls it (orphaned) | **Implement as a real scheduled job** (`@nestjs/schedule`) — this is finishing unwired infrastructure, not changing a business rule. |
| Recurring transactions | Fixed-duration batch generation at creation time (1–60 months), each future row is an independent, unlinked copy — not an ongoing cron-driven series | Keep exactly as-is. |
| Debt installments | Flat division of `totalAmount` across N installments; each installment auto-creates a linked `Transaction`; paying/unpaying either side stays in sync bidirectionally | Keep exactly as-is. |
| Vehicle maintenance alerts | Whichever of mileage-based or date-based signal is more urgent wins (thresholds: overdue / ≤10% km or ≤15 days = urgent / ≤20% km or ≤30 days = warning / else on-track) | Keep exact thresholds. |
| Vehicle license plate | No uniqueness constraint | Keep as-is. |
| Vehicle mileage | Can never be edited to a lower value than currently stored | Keep as-is. |
| Debt `status = CANCELLED` | Referenced in one summary query, never actually set anywhere | Drop — not a real status; use `ACTIVE` \| `PAID_OFF` \| `OVERDUE` only. |
| Bank statement / CSV import (Nubank, Inter, generic CSV) | Backend logic is a thin, near-identical "bulk insert expenses" endpoint per bank; the real complexity (parsing, column mapping, installment detection) is client-side JS | **Backlog — not scheduled in this spec round.** See `docs/steering/roadmap.md`. |
| "Universidade" content pages | No backing database table found — static/content pages, not a data feature | **Dropped.** Not part of the rebuild. |

## Non-goals for the rebuild

- No web frontend. The API has no server-rendered views.
- No feature parity requirement with legacy quirks that don't serve the
  current user base — flag anything that looks like dead legacy behavior
  instead of silently porting it (see table above).
- Bank statement import (CSV/Nubank/Inter) and static content pages
  ("Universidade") are out of scope for the current roadmap — see Backlog
  in `docs/steering/roadmap.md`.
