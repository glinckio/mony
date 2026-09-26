// Dev-only switches for the design workflow (design/brief.md → Refino).
// In release builds `__DEV__` is inlined as `false` and the minifier drops
// the branches that read these, along with the catalog, the mock backend
// and the overlays (required behind `__DEV__`). What does ship: this file
// and the tiny DesignLab store (dev/design-lab.ts), which api-client.ts
// and theme/motion.ts import statically — inert there, since every read
// is gated on DEV_TOOLS_ENABLED (mocks off, no motion override).

// Jest also runs with `__DEV__ === true`; tests mock the API client
// themselves and must never hit the in-memory mock backend.
export const DEV_TOOLS_ENABLED = __DEV__ && process.env.NODE_ENV !== "test";

// `true` makes the dev build open on the Screen Catalog (used while
// screens were being redesigned). Every screen in design/telas.md is
// "Pronta", so the app opens on the normal flow; the catalog stays
// reachable through the floating Lab pill.
export const CATALOG_ON_START = false;

// Default for the DesignLab "mocks" toggle. Off since the redesign was
// approved (2026-09-26): the dev build talks to EXPO_PUBLIC_API_URL again.
// Switch "Dados → Mock" in the catalog to use the in-memory mock backend
// (src/dev/mock-api) for design work.
export const MOCKS_BY_DEFAULT = false;
