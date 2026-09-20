// Neutral placeholder design system. Swap these values once the client
// delivers final brand/design assets — consumers should never hardcode
// raw colors/spacing, only reference these tokens.

export const color = {
  background: "#0B0F14",
  surface: "#141A21",
  surfaceAlt: "#1C232C",
  border: "#2A333D",
  textPrimary: "#F5F7FA",
  textSecondary: "#9AA5B1",
  primary: "#3B82F6",
  success: "#22C55E",
  warning: "#F59E0B",
  danger: "#EF4444",
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const radius = {
  sm: 4,
  md: 8,
  lg: 16,
  pill: 999,
} as const;

export const typography = {
  fontFamily: "System",
  size: {
    xs: 12,
    sm: 14,
    md: 16,
    lg: 20,
    xl: 28,
  },
  weight: {
    regular: "400",
    medium: "500",
    bold: "700",
  },
} as const;

export type ColorToken = keyof typeof color;
export type SpacingToken = keyof typeof spacing;
