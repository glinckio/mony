import { tokens } from "@mony/ui-tokens";

export { ThemeProvider, useTheme, useThemedStyles, type Theme } from "./ThemeProvider";
export { motionTokens, useMotion } from "./motion";

// Theme-independent tokens, safe to use inside module-level StyleSheets.
export const space = tokens.spacing;
export const layout = tokens.layout;
export const radius = tokens.radius;
export const typeScale = tokens.typeScale;
export const iconSize = tokens.iconSize;
