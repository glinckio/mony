# Mony — Root Steering

Read this first, in every session, regardless of which terminal or
directory inside the repo you were opened in. It is the single source of
truth for what this project is and how work gets done here.

## What this project is

Mony is a personal finance app being rebuilt from a legacy PHP web app
(`legacy_php_reference/`, read-only reference) into:
- `apps/api` — NestJS backend
- `apps/mobile` — React Native (Expo) mobile app, iOS + Android

The client dropped the web product entirely — **mobile app + API only**.

Full context:
- Domain, entities, LGPD scope → `docs/steering/product.md`
- Stack, commands, non-negotiable rules → `docs/steering/tech.md`
- Repo layout, module boundaries → `docs/steering/structure.md`
- Feature specs (SDD) → `docs/specs/<feature>/`
- Roadmap/phases → `docs/steering/roadmap.md`

## Language

Two different things, don't conflate them:

1. **The codebase is English**: code, identifiers, comments, commit
   messages, spec docs, database table/column names, API error messages
   (`class-validator` messages, Swagger text, Postman examples). This was
   an explicit client/owner decision; do not default back to Portuguese
   anywhere in `apps/`, `packages/`, or `docs/`, even when translating
   legacy PT-BR business rules.
2. **The app's user-facing text is Portuguese (pt-BR)** — the end users
   are Brazilian. Every string a user actually sees or hears in
   `apps/mobile` is PT-BR: screen titles, labels, placeholders, button
   text, toasts, and validation/error messages. This includes the zod
   schemas in `packages/shared-types` — their `.refine()`/regex error
   messages are consumed by the mobile UI for inline form validation, so
   they're PT-BR too, same as any other on-screen string.
   - **The mobile app never displays a raw API error string to the
     user.** The API's `message` field stays English (rule 1) and is a
     technical/developer-facing contract, not UI copy. The mobile
     `api-client`/screen layer maps known status codes (409, specific
     400s, etc.) to the app's own PT-BR copy; anything unmapped falls
     back to a generic PT-BR message ("Algo deu errado. Tente
     novamente." or equivalent) — never `error.message` interpolated
     directly into the UI.

Chat replies to the human may stay in Portuguese regardless; nothing
written to disk is governed by that — it's governed by the two rules
above depending on which side of the API boundary the text lives on.

## Non-negotiable rules (see `docs/steering/tech.md` for detail)

1. Follow SDD: `requirements.md` → `design.md` → `tasks.md` before
   implementing any feature (templates in `docs/specs/_templates/`).
2. Every endpoint: full Swagger decorators + DTO validation + a real,
   non-placeholder example added to `docs/postman/collection.json`.
3. No task is done with failing lint, typecheck, or tests.
4. Run the relevant subagents from `.claude/agents/` before calling a
   phase complete: `code-reviewer`, `qa-engineer`,
   `api-contract-guardian`, `performance-auditor`,
   `lgpd-security-reviewer` (when the feature touches personal/financial
   data), and always `workflow-guardian` last.
5. **Never run `git commit`, `git push`, or `git add -A` in this repo.**
   Commit message text is drafted (by `workflow-guardian`) for the human
   to apply themselves — this is an explicit, standing instruction, not a
   per-task question.
6. iOS is tested via Expo Go / EAS Build (no local Xcode available).
   Android is tested via the already-configured Android Studio ADB setup.
   Don't suggest bare React Native CLI workflows that assume a local Mac.

## Common commands

See `docs/steering/tech.md` → Commands.
