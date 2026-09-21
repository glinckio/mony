// Mony design tokens — sourced from the client's existing brand palette
// (extracted from legacy_php_reference's built Tailwind/shadcn CSS custom
// properties: --primary, --background, --foreground, --success, etc., and
// cross-checked against the Mony "M" logo gradient). Light theme only for
// now — the legacy CSS defines a `.dark` variant too, kept as a reference
// in docs/steering/design-system.md if dark mode is ever requested.
//
// Consumers never hardcode raw colors/spacing/radii — always reference a
// token. This file IS the design system's source of truth; component
// styles are built from it, not the other way around.

export const color = {
  // Brand
  primary: "#166FE3",
  primaryPressed: "#125BBA",
  primaryMuted: "#E8F1FD", // soft background for selected chips, badges
  onPrimary: "#FFFFFF", // text/icons drawn on top of `primary`

  // Surfaces
  background: "#FAFAFA", // screen background
  surface: "#FFFFFF", // cards, inputs, sheets
  surfaceAlt: "#F1F5F9", // secondary fill (disabled inputs, subtle sections)
  overlay: "rgba(15, 23, 42, 0.45)", // modal/sheet backdrops

  // Borders
  border: "#E1E7EF",
  borderFocus: "#166FE3",

  // Text
  textPrimary: "#2B303B",
  textSecondary: "#65758B",
  textDisabled: "#9AA5B1",

  // Semantic
  success: "#1DAF52",
  successMuted: "#E5FBED",
  danger: "#EF4444",
  dangerMuted: "#FDE8E8",
  warning: "#D97706",
  warningMuted: "#FFFAEB",
  info: "#3B82F6",
  infoMuted: "#E7EFFE",
} as const;

export const spacing = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

// Matches the legacy design's --radius: .75rem (12px) base.
export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  pill: 999,
} as const;

export const typography = {
  fontFamily: "System",
  size: {
    xs: 12,
    sm: 14,
    md: 16,
    lg: 18,
    xl: 22,
    xxl: 28,
    display: 34,
  },
  lineHeight: {
    xs: 16,
    sm: 20,
    md: 24,
    lg: 26,
    xl: 30,
    xxl: 36,
    display: 42,
  },
  weight: {
    regular: "400",
    medium: "500",
    semibold: "600",
    bold: "700",
  },
} as const;

// React Native shadow props — spread directly into a StyleSheet entry.
// `elevation` covers Android, the `shadow*` props cover iOS.
export const shadow = {
  none: {},
  sm: {
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 2,
  },
  md: {
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 4,
  },
} as const;

// Minimum touch target (44pt iOS HIG / 48dp Material) and common control
// heights, so every button/input/switch across the app lines up.
export const size = {
  touchTarget: 44,
  controlHeight: 52,
  iconSm: 16,
  iconMd: 20,
  iconLg: 24,
  maxContentWidth: 480, // caps form/card width on tablets
} as const;

export type ColorToken = keyof typeof color;
export type SpacingToken = keyof typeof spacing;
export type RadiusToken = keyof typeof radius;
export type ShadowToken = keyof typeof shadow;
