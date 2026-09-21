import { color, typography } from "@mony/ui-tokens";
import type { ReactNode } from "react";
import { Text as RNText, type TextProps as RNTextProps, StyleSheet } from "react-native";

export type TextVariant = "display" | "heading" | "title" | "body" | "bodyStrong" | "caption";

interface TextProps extends RNTextProps {
  variant?: TextVariant;
  color?: string;
  children: ReactNode;
}

export function Text({ variant = "body", color: colorProp, style, children, ...rest }: TextProps) {
  return (
    <RNText
      style={[styles[variant], colorProp ? { color: colorProp } : undefined, style]}
      {...rest}
    >
      {children}
    </RNText>
  );
}

const styles = StyleSheet.create({
  display: {
    fontSize: typography.size.display,
    lineHeight: typography.lineHeight.display,
    fontWeight: typography.weight.bold,
    color: color.textPrimary,
  },
  heading: {
    fontSize: typography.size.xxl,
    lineHeight: typography.lineHeight.xxl,
    fontWeight: typography.weight.bold,
    color: color.textPrimary,
  },
  title: {
    fontSize: typography.size.xl,
    lineHeight: typography.lineHeight.xl,
    fontWeight: typography.weight.semibold,
    color: color.textPrimary,
  },
  body: {
    fontSize: typography.size.md,
    lineHeight: typography.lineHeight.md,
    fontWeight: typography.weight.regular,
    color: color.textPrimary,
  },
  bodyStrong: {
    fontSize: typography.size.md,
    lineHeight: typography.lineHeight.md,
    fontWeight: typography.weight.medium,
    color: color.textPrimary,
  },
  caption: {
    fontSize: typography.size.sm,
    lineHeight: typography.lineHeight.sm,
    fontWeight: typography.weight.regular,
    color: color.textSecondary,
  },
});
