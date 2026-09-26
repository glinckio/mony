import { LinearGradient } from "expo-linear-gradient";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";

import { layout, radius, space, useTheme, type Theme } from "../../theme";
import { haptic as haptics } from "../../theme/haptics";

import { Icon, type IconName } from "./Icon";
import { MarkLoader } from "./MarkLoader";
import { Text } from "./Text";
import { Touchable } from "./Touchable";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "dangerGhost";

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: "md" | "sm";
  loading?: boolean;
  disabled?: boolean;
  leftIcon?: IconName;
  fullWidth?: boolean;
  haptic?: keyof typeof haptics;
  accessibilityHint?: string;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

function paint(variant: ButtonVariant, colors: Theme["colors"]) {
  switch (variant) {
    case "primary":
      return { background: "transparent", label: colors.onPrimary };
    case "secondary":
      return { background: colors.primaryMuted, label: colors.primary };
    case "danger":
      return { background: colors.danger, label: colors.onDanger };
    case "dangerGhost":
      return { background: "transparent", label: colors.danger };
    case "ghost":
    default:
      return { background: "transparent", label: colors.primary };
  }
}

// Primary = the brand gradient with a soft indigo glow; secondary = soft
// indigo fill. Presses in slightly; while loading the label gives way to
// a small loader inside the button and taps are ignored.
export function Button({
  label,
  onPress,
  variant = "primary",
  size = "md",
  loading = false,
  disabled = false,
  leftIcon,
  fullWidth = true,
  haptic,
  accessibilityHint,
  style,
  testID,
}: ButtonProps) {
  const { colors, gradients, elevation } = useTheme();
  const { background, label: labelColor } = paint(variant, colors);
  const inactive = disabled || loading;
  const primary = variant === "primary";

  return (
    <Touchable
      testID={testID}
      feedback="sink"
      haptic={haptic}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: inactive, busy: loading }}
      disabled={inactive}
      onPress={onPress}
      hitSlop={size === "sm" ? 4 : undefined}
      style={[
        styles.base,
        size === "sm" ? styles.small : styles.medium,
        { backgroundColor: background },
        primary && !disabled ? elevation("md") : null,
        fullWidth ? styles.fullWidth : styles.hug,
        disabled && !loading && styles.disabled,
        style,
      ]}
    >
      {primary ? (
        <LinearGradient
          colors={gradients.brand}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[StyleSheet.absoluteFill, styles.gradient]}
        />
      ) : null}
      {loading ? (
        <MarkLoader color={labelColor} accessibilityLabel={`${label}, carregando`} />
      ) : (
        <View style={styles.content}>
          {leftIcon && <Icon name={leftIcon} size="md" color={labelColor} />}
          <Text variant={size === "sm" ? "subhead" : "label"} color={labelColor} numberOfLines={1}>
            {label}
          </Text>
        </View>
      )}
    </Touchable>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.md,
  },
  gradient: {
    borderRadius: radius.md,
  },
  medium: {
    minHeight: layout.controlHeight,
    paddingHorizontal: space.xl,
  },
  small: {
    minHeight: 40,
    paddingHorizontal: space.lg,
    borderRadius: radius.sm,
  },
  fullWidth: {
    alignSelf: "stretch",
  },
  hug: {
    alignSelf: "flex-start",
  },
  disabled: {
    opacity: 0.45,
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.sm,
  },
});
