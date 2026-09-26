import {
  tokens,
  type ElevationToken,
  type GradientName,
  type SemanticColors,
} from "@mony/ui-tokens";
import { createContext, useContext, useMemo, type ReactNode } from "react";
import { Platform, type ViewStyle } from "react-native";

export interface Theme {
  // The app ships a single light theme (owner decision, design/brief.md).
  scheme: "light";
  colors: SemanticColors;
  gradients: Record<GradientName, readonly [string, string]>;
  // Soft, indigo-tinted shadow for one elevation level.
  elevation: (level: ElevationToken) => ViewStyle;
}

const colors: SemanticColors = tokens.colors.light;

// One shadow style object per level, built once: `elevation()` is called
// on every render of every card, so it hands out the same (stable) object.
const ELEVATION = Object.fromEntries(
  (Object.keys(tokens.elevation) as ElevationToken[]).map((level) => {
    const spec = tokens.elevation[level];
    return [
      level,
      Platform.select<ViewStyle>({
        android: { elevation: spec.android, shadowColor: colors.shadow },
        default: {
          shadowColor: colors.shadow,
          shadowOffset: { width: 0, height: spec.y },
          shadowOpacity: spec.opacity,
          shadowRadius: spec.blur / 2,
        },
      }),
    ];
  }),
) as Record<ElevationToken, ViewStyle>;

const THEME: Theme = {
  scheme: "light",
  colors,
  gradients: tokens.gradient,
  elevation: (level) => ELEVATION[level],
};

const ThemeContext = createContext<Theme>(THEME);

export function ThemeProvider({ children }: { children: ReactNode }) {
  return <ThemeContext.Provider value={THEME}>{children}</ThemeContext.Provider>;
}

export function useTheme(): Theme {
  return useContext(ThemeContext);
}

// `factory` must be a module-level function (stable identity).
export function useThemedStyles<T>(factory: (theme: Theme) => T): T {
  const theme = useTheme();
  return useMemo(() => factory(theme), [factory, theme]);
}
