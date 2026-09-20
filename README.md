# Mony

Personal finance app: NestJS API + React Native (Expo) mobile app.
Rebuilt from a legacy PHP app (`legacy_php_reference/`, reference only).

Start here: [`CLAUDE.md`](./CLAUDE.md) and [`docs/steering/`](./docs/steering/).

## Quick start

```bash
pnpm install
pnpm --filter @mony/api dev       # http://localhost:3000, Swagger at /docs
pnpm --filter @mony/mobile dev    # Expo dev server — scan QR with Expo Go on iPhone,
                                   # or press "a" to launch on an Android emulator/device via adb
```

## Repo layout

See [`docs/steering/structure.md`](./docs/steering/structure.md).

## Contributing workflow

See [`docs/steering/tech.md`](./docs/steering/tech.md) and
[`docs/specs/README.md`](./docs/specs/README.md) for the spec-driven
development flow every feature follows.
