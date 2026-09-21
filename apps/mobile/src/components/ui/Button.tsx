import { color, radius, size as sizeTokens, spacing } from "@mony/ui-tokens";
import type { ReactNode } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  TouchableOpacity,
  type TouchableOpacityProps,
} from "react-native";

import { Text } from "./Text";

export type ButtonVariant = "primary" | "secondary" | "ghost";

interface ButtonProps extends Omit<TouchableOpacityProps, "style"> {
  label: string;
  variant?: ButtonVariant;
  loading?: boolean;
  leftIcon?: ReactNode;
  fullWidth?: boolean;
}

export function Button({
  label,
  variant = "primary",
  loading = false,
  disabled,
  leftIcon,
  fullWidth = true,
  testID,
  ...rest
}: ButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <TouchableOpacity
      testID={testID}
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      activeOpacity={0.85}
      disabled={isDisabled}
      style={[
        styles.base,
        variantStyles[variant],
        fullWidth && styles.fullWidth,
        isDisabled && styles.disabled,
      ]}
      {...rest}
    >
      {loading ? (
        <ActivityIndicator color={variant === "primary" ? color.onPrimary : color.primary} />
      ) : (
        <>
          {leftIcon}
          <Text
            variant="bodyStrong"
            color={variant === "primary" ? color.onPrimary : color.primary}
            style={leftIcon ? styles.labelWithIcon : undefined}
          >
            {label}
          </Text>
        </>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    minHeight: sizeTokens.controlHeight,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
  },
  fullWidth: {
    alignSelf: "stretch",
  },
  disabled: {
    opacity: 0.5,
  },
  labelWithIcon: {
    marginLeft: spacing.sm,
  },
});

const variantStyles = StyleSheet.create({
  primary: {
    backgroundColor: color.primary,
  },
  secondary: {
    backgroundColor: color.surface,
    borderWidth: 1,
    borderColor: color.border,
  },
  ghost: {
    backgroundColor: "transparent",
  },
});
