# Specs (Spec-Driven Development)

One folder per feature: `docs/specs/<feature-name>/`, copied from
`_templates/`. Flow:

1. `requirements.md` — written and agreed before any code.
2. `design.md` — data model, API surface, screens, error handling.
3. `tasks.md` — granular checklist, one commit per task roughly.

No implementation starts until `requirements.md` and `design.md` exist for
that feature. See `docs/steering/tech.md` for the non-negotiable rules that
apply to every task (lint, tests, Swagger, Postman collection).
