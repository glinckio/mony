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

**Everything in the repository is English** — code, identifiers, comments,
commit messages, spec docs, database table/column names, API error
messages. This was an explicit client/owner decision; do not default back
to Portuguese anywhere in `apps/`, `packages/`, or `docs/`, even when
translating legacy PT-BR business rules. Chat replies to the human may
stay in Portuguese; nothing written to disk does.

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
