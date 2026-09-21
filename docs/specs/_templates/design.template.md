# Design — <Feature Name>

## Data model (Prisma)

```prisma
// New/changed models for this feature
```

## API surface

| Method | Path | Auth | Request DTO | Response DTO | Error cases |
|---|---|---|---|---|---|
| GET | `/example` | Bearer | — | `ExampleResponseDto` | 401 |

For each endpoint above, list the DTO fields and validation rules
(`class-validator` decorators) here before writing code.

## Mobile screens

| Screen | Route | Reads | Writes | Notes |
|---|---|---|---|---|
| `ExampleScreen` | `/example` | `GET /example` | — | |

## Shared types

List what gets added to `packages/shared-types/src/`.

## Error handling

Non-happy paths this feature must handle explicitly (network failure,
validation error, 401/403, empty states). Per `docs/steering/tech.md`
language policy: map each API error case to the app's own pt-BR copy
here — never plan to show a raw API `message` string to the user.
