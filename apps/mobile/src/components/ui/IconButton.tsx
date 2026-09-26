import { StyleSheet, type StyleProp, type ViewStyle } from "react-native";

import { layout, radius, useTheme } from "../../theme";
import { haptic as haptics } from "../../theme/haptics";

import { Icon, type IconName } from "./Icon";
import { Touchable } from "./Touchable";

interface IconButtonProps {
  icon: IconName;
  accessibilityLabel: string;
  onPress: () => void;
  // plain: bare glyph in a 48 hit area
  // soft: white circle with a soft shadow (back, header actions)
  // overlay: translucent circle, for use over photos
  // ink: small solid indigo circle (grocery stepper)
  variant?: "plain" | "soft" | "overlay" | "ink";
  tone?: "default" | "primary" | "danger";
  disabled?: boolean;
  filled?: boolean;
  haptic?: keyof typeof haptics;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

export function IconButton({
  icon,
  accessibilityLabel,
  onPress,
  variant = "plain",
  tone = "default",
  disabled = false,
  filled = false,
  haptic,
  style,
  testID,
}: IconButtonProps) {
  const { colors, elevation } = useTheme();
  const toneColor =
    tone === "danger" ? colors.danger : tone === "primary" ? colors.primary : colors.text;
  const glyphColor = variant === "ink" || variant === "overlay" ? colors.onPrimary : toneColor;
  const surface =
    variant === "soft"
      ? { backgroundColor: colors.surface, ...elevation("sm") }
      : variant === "overlay"
        ? { backgroundColor: colors.overlay }
        : variant === "ink"
          ? { backgroundColor: colors.primary }
          : null;
  const diameter = variant === "ink" ? 36 : 44;
  const slop = (layout.touchTarget - diameter) / 2;

  return (
    <Touchable
      testID={testID}
      feedback={variant === "plain" ? "fade" : "sink"}
      haptic={haptic}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      hitSlop={variant === "plain" ? undefined : slop}
      style={[
        variant === "plain" ? styles.plain : [styles.round, { width: diameter, height: diameter }],
        surface,
        disabled && styles.disabled,
        style,
      ]}
    >
      <Icon
        name={icon}
        size={variant === "ink" || variant === "soft" ? "md" : "lg"}
        color={glyphColor}
        filled={filled}
      />
    </Touchable>
  );
}

const styles = StyleSheet.create({
  plain: {
    width: layout.touchTarget,
    height: layout.touchTarget,
    alignItems: "center",
    justifyContent: "center",
  },
  round: {
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  disabled: {
    opacity: 0.35,
  },
});
