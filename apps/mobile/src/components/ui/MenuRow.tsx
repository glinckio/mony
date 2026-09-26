import type { ReactNode } from "react";
import { StyleSheet, View } from "react-native";

import { space, useTheme } from "../../theme";

import { Icon, type IconName } from "./Icon";
import { IconBadge } from "./Surfaces";
import { Text } from "./Text";
import { Touchable } from "./Touchable";

interface MenuRowProps {
  icon: IconName;
  // Badge hue (defaults to the brand).
  color?: string;
  label: string;
  description?: string;
  onPress: () => void;
  tone?: "default" | "danger";
  trailing?: ReactNode;
  divider?: boolean;
  testID?: string;
}

// A navigation row inside a white card: pastel badge, label + description,
// chevron. Rows in the same card are split by a hairline.
export function MenuRow({
  icon,
  color,
  label,
  description,
  onPress,
  tone = "default",
  trailing,
  divider = false,
  testID,
}: MenuRowProps) {
  const { colors } = useTheme();
  const danger = tone === "danger";
  return (
    <Touchable
      testID={testID}
      feedback="row"
      accessibilityRole="button"
      accessibilityLabel={description ? `${label}. ${description}` : label}
      onPress={onPress}
      style={[
        styles.row,
        divider && { borderTopWidth: StyleSheet.hairlineWidth * 2, borderTopColor: colors.border },
      ]}
    >
      <IconBadge icon={icon} color={danger ? colors.danger : (color ?? colors.primary)} size={42} />
      <View style={styles.text}>
        <Text variant="bodyStrong" color={danger ? colors.danger : undefined} numberOfLines={1}>
          {label}
        </Text>
        {description ? (
          <Text variant="footnote" tone="muted" numberOfLines={2}>
            {description}
          </Text>
        ) : null}
      </View>
      {trailing ??
        (danger ? null : <Icon name="chevron-forward" size="md" color={colors.textSubtle} />)}
    </Touchable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
    paddingVertical: space.md,
    paddingHorizontal: space.lg,
    minHeight: 64,
  },
  text: {
    flex: 1,
    gap: 1,
  },
});
