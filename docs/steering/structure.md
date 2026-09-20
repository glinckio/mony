# Structure Steering — Mony

```
mony/
├── CLAUDE.md                      # root steering, loaded by every session
├── apps/
│   ├── api/                       # NestJS — one module per domain entity
│   │   └── src/<feature>/         # controller, service, dtos/, entities via Prisma
│   └── mobile/                    # Expo React Native
│       └── src/
│           ├── screens/<feature>/
│           ├── components/        # shared, dumb components only
│           └── lib/                # api client, stores, hooks
├── packages/
│   ├── shared-types/               # DTOs / zod schemas shared api <-> mobile
│   ├── ui-tokens/                   # design tokens (placeholder until client design lands)
│   └── config/                      # eslint, prettier, tsconfig bases
├── docs/
│   ├── steering/                    # this file, product.md, tech.md
│   ├── specs/<feature>/             # requirements.md, design.md, tasks.md per feature
│   │   └── _templates/               # copy these to start a new feature spec
│   └── postman/collection.json      # kept in sync with the live OpenAPI doc
├── .claude/agents/                  # specialized review/QA subagents
└── legacy_php_reference/            # old PHP app + SQL dump, read-only reference only
```

## Module boundary rules

- A mobile screen never imports directly from `apps/api` — only from
  `@mony/shared-types` and its own `lib/api-client`.
- A Nest module for one domain entity (e.g. `debts`) does not import
  another feature module's service directly; go through a shared
  service in `src/common` if cross-feature logic is needed.
- `legacy_php_reference/` is never imported or executed — read-only
  reference for porting business rules.
