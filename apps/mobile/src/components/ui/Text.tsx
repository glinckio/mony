import type { SemanticColorName, TypeVariant } from "@mony/ui-tokens";
import { forwardRef } from "react";
import { Text as RNText, type TextProps as RNTextProps, type TextStyle } from "react-native";

import { typeScale, useTheme } from "../../theme";

export type TextTone =
  | "default"
  | "muted"
  | "subtle"
  | "primary"
  | "success"
  | "warning"
  | "danger"
  | "onPrimary"
  | "onAccent"
  | "onSuccessMuted"
  | "onWarningMuted"
  | "onDangerMuted"
  | "onPrimaryMuted"
  | "onDanger";

const TONE_TO_COLOR: Record<TextTone, SemanticColorName> = {
  default: "text",
  muted: "textMuted",
  subtle: "textSubtle",
  primary: "primary",
  success: "success",
  warning: "onWarningMuted",
  danger: "danger",
  onPrimary: "onPrimary",
  onAccent: "onAccent",
  onSuccessMuted: "onSuccessMuted",
  onWarningMuted: "onWarningMuted",
  onDangerMuted: "onDangerMuted",
  onPrimaryMuted: "onPrimaryMuted",
  onDanger: "onDanger",
};

// Only the big display sizes stop growing (at 130%), so the hero number
// stays on screen; body text follows the system font scale all the way.
const LARGE_VARIANTS = new Set<TypeVariant>([
  "display",
  "title1",
  "amountInput",
  "numeralLarge",
  "odometer",
]);

export function typeStyle(variant: TypeVariant): TextStyle {
  const spec = typeScale[variant];
  return {
    fontFamily: spec.fontFamily,
    fontSize: spec.fontSize,
    lineHeight: spec.lineHeight,
    letterSpacing: spec.letterSpacing,
    ...(spec.tabular ? { fontVariant: ["tabular-nums"] } : null),
    ...(spec.uppercase ? { textTransform: "uppercase" } : null),
  };
}

function withoutLineHeight({ lineHeight: _lineHeight, ...style }: TextStyle): TextStyle {
  return style;
}

// Built once: Text is the most rendered component in the app.
const VARIANTS = Object.keys(typeScale) as TypeVariant[];
const TYPE_STYLES = Object.fromEntries(
  VARIANTS.map((variant) => [variant, typeStyle(variant)]),
) as Record<TypeVariant, TextStyle>;
const INLINE_TYPE_STYLES = Object.fromEntries(
  VARIANTS.map((variant) => [variant, withoutLineHeight(TYPE_STYLES[variant])]),
) as Record<TypeVariant, TextStyle>;

export interface TextProps extends RNTextProps {
  variant?: TypeVariant;
  tone?: TextTone;
  // Raw semantic color override (e.g. a category's own color is never
  // used for text; this is for theme colors a tone doesn't cover).
  color?: string;
  align?: TextStyle["textAlign"];
  // A run nested inside another Text: drops its own line height so the
  // paragraph keeps the outer one. On Android a nested run's line height
  // applies to the whole line and clips the bigger glyphs around it.
  inline?: boolean;
}

export const Text = forwardRef<RNText, TextProps>(function Text(
  {
    variant = "body",
    tone = "default",
    color,
    align,
    inline = false,
    style,
    maxFontSizeMultiplier,
    ...rest
  },
  ref,
) {
  const { colors } = useTheme();
  return (
    <RNText
      ref={ref}
      maxFontSizeMultiplier={
        maxFontSizeMultiplier ?? (LARGE_VARIANTS.has(variant) ? 1.3 : undefined)
      }
      style={[
        inline ? INLINE_TYPE_STYLES[variant] : TYPE_STYLES[variant],
        { color: color ?? colors[TONE_TO_COLOR[tone]] },
        align ? { textAlign: align } : null,
        style,
      ]}
      {...rest}
    />
  );
});
