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

## Mobile screen conventions

- `App.tsx` wraps everything in a single root-level `SafeAreaProvider`
  (from `react-native-safe-area-context`) — screens don't each create
  their own.
- Every screen navigated to with `headerShown: false` (all of them, so
  far) wraps its own content in `SafeAreaView` (also from
  `react-native-safe-area-context`, not the older core-RN one) — there's
  no navigation header to already account for the notch/home-indicator
  insets.
- Screens with text inputs additionally wrap in `KeyboardAvoidingView`
  (`behavior="padding"` on iOS, `undefined` on Android — Android usually
  handles this via `windowSoftInputMode` instead) so the keyboard doesn't
  cover the focused field. Screens with no inputs (e.g. a pure display
  screen) skip it — this is a per-screen judgment call, not a blanket
  rule.

## Module boundary rules

- A mobile screen never imports directly from `apps/api` — only from
  `@mony/shared-types` and its own `lib/api-client`.
- A Nest module for one domain entity (e.g. `debts`) does not import
  another feature module's service directly; go through a shared
  service in `src/common` if cross-feature logic is needed.
- `legacy_php_reference/` is never imported or executed — read-only
  reference for porting business rules.
