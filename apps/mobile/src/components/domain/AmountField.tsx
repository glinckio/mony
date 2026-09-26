import { forwardRef, useState } from "react";
import { StyleSheet, TextInput, View, type TextInputProps } from "react-native";

import { formatAmountDisplay, parseAmountInput } from "../../lib/currency-mask";
import { radius, space, useTheme } from "../../theme";
import { Icon } from "../ui/Icon";
import { Text, typeStyle } from "../ui/Text";

interface AmountFieldProps extends Omit<TextInputProps, "value" | "onChangeText"> {
  label: string;
  value: number | undefined;
  onChangeValue: (value: number | undefined) => void;
  // Expense shows "−" in red, income "+" in green; none = neutral.
  direction?: "in" | "out";
  error?: string;
  size?: "hero" | "compact";
}

// The amount being entered, as the form's hero: a white card with the
// signed value in large tabular digits (existing R$ mask), the system
// number pad, and the error below.
export const AmountField = forwardRef<TextInput, AmountFieldProps>(function AmountField(
  {
    label,
    value,
    onChangeValue,
    direction,
    error,
    size = "hero",
    testID,
    onFocus,
    onBlur,
    ...rest
  },
  ref,
) {
  const { colors, elevation } = useTheme();
  const [focused, setFocused] = useState(false);
  const signColor =
    direction === "in" ? colors.success : direction === "out" ? colors.danger : colors.textMuted;
  const hero = size === "hero";

  return (
    <View style={styles.container}>
      <View
        style={[
          styles.card,
          hero ? styles.hero : styles.compact,
          {
            backgroundColor: colors.surface,
            borderColor: error ? colors.danger : focused ? colors.primary : "transparent",
          },
          elevation(focused ? "md" : "sm"),
        ]}
      >
        <Text variant="subhead" tone={error ? "danger" : "muted"}>
          {label}
        </Text>
        <View style={styles.valueRow}>
          {direction ? (
            <Text variant={hero ? "title1" : "title2"} color={signColor}>
              {direction === "in" ? "+" : "−"}
            </Text>
          ) : null}
          <TextInput
            ref={ref}
            testID={testID}
            accessibilityLabel={label}
            accessibilityHint={error}
            value={formatAmountDisplay(value)}
            onChangeText={(text) => onChangeValue(parseAmountInput(text))}
            keyboardType="number-pad"
            placeholder="R$ 0,00"
            placeholderTextColor={colors.textSubtle}
            selectionColor={colors.primary}
            cursorColor={colors.primary}
            keyboardAppearance="light"
            onFocus={(event) => {
              setFocused(true);
              onFocus?.(event);
            }}
            onBlur={(event) => {
              setFocused(false);
              onBlur?.(event);
            }}
            style={[
              styles.input,
              typeStyle(hero ? "amountInput" : "numeralLarge"),
              { color: colors.text },
            ]}
            {...rest}
          />
        </View>
      </View>
      {error ? (
        <View style={styles.error}>
          <Icon name="alert-circle" size="sm" color={colors.danger} />
          <Text variant="footnote" tone="danger" style={styles.flex}>
            {error}
          </Text>
        </View>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    gap: space.xs + 2,
  },
  card: {
    borderRadius: radius.lg,
    borderWidth: 1.5,
    gap: space.xs,
  },
  hero: {
    paddingHorizontal: space.xl,
    paddingVertical: space.lg,
  },
  compact: {
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
  },
  valueRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.sm,
  },
  input: {
    flex: 1,
    paddingVertical: 0,
  },
  error: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: space.xs,
  },
  flex: {
    flex: 1,
  },
});
