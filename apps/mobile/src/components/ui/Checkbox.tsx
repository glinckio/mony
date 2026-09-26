import { StyleSheet, View } from "react-native";

import { layout, radius, space, useTheme } from "../../theme";

import { Icon } from "./Icon";
import { Text } from "./Text";
import { Touchable } from "./Touchable";

interface CheckboxProps {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  description?: string;
  disabled?: boolean;
  testID?: string;
}

// Ink square with the label beside it; the whole row is the target.
export function Checkbox({
  label,
  checked,
  onChange,
  description,
  disabled = false,
  testID,
}: CheckboxProps) {
  const { colors } = useTheme();
  return (
    <Touchable
      testID={testID}
      feedback="fade"
      haptic="selection"
      accessibilityRole="checkbox"
      accessibilityLabel={label}
      accessibilityState={{ checked, selected: checked, disabled }}
      disabled={disabled}
      onPress={() => onChange(!checked)}
      style={styles.row}
    >
      <View
        style={[
          styles.box,
          checked
            ? { backgroundColor: colors.primary, borderColor: colors.primary }
            : { borderColor: colors.borderStrong },
        ]}
      >
        {checked && <Icon name="checkmark" size="sm" color={colors.onPrimary} />}
      </View>
      <View style={styles.text}>
        <Text variant="bodyStrong">{label}</Text>
        {description ? (
          <Text variant="footnote" tone="muted">
            {description}
          </Text>
        ) : null}
      </View>
    </Touchable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
    minHeight: layout.touchTarget,
  },
  box: {
    width: 22,
    height: 22,
    borderRadius: radius.xs,
    borderWidth: 1.5,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  text: {
    flex: 1,
    gap: space.xxs,
  },
});
