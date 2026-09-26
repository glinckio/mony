// Mony design tokens — "Índigo Suave" direction (see design/style-guide.md).
// Values are generated from design/tokens.json into ./generated.ts; this
// file only re-exports them with the types the app consumes. The mobile app
// reads them through its theme (`apps/mobile/src/theme`, light only) —
// screens never hardcode raw colors/spacing/radii.

import type * as generated from "./generated";

export * as tokens from "./generated";

export type ColorScheme = keyof typeof generated.colors;
export type SemanticColorName = keyof typeof generated.colors.light;
export type SemanticColors = Record<SemanticColorName, string>;
export type TypeVariant = keyof typeof generated.typeScale;
export type SpacingToken = keyof typeof generated.spacing;
export type RadiusToken = keyof typeof generated.radius;
export type ElevationToken = keyof typeof generated.elevation;
export type GradientName = keyof typeof generated.gradient;
