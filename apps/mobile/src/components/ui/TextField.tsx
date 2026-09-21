import { Ionicons } from "@expo/vector-icons";
import { color, radius, size as sizeTokens, spacing, typography } from "@mony/ui-tokens";
import { forwardRef, useState } from "react";
import { StyleSheet, TextInput, type TextInputProps, TouchableOpacity, View } from "react-native";

import { Text } from "./Text";

interface TextFieldProps extends TextInputProps {
  label: string;
  error?: string;
  secureToggle?: boolean;
}

export const TextField = forwardRef<TextInput, TextFieldProps>(
  ({ label, error, secureToggle = false, secureTextEntry, style, testID, ...rest }, ref) => {
    const [isFocused, setIsFocused] = useState(false);
    const [revealed, setRevealed] = useState(false);
    const isSecure = secureToggle ? !revealed : secureTextEntry;

    return (
      <View style={styles.container}>
        <Text variant="caption" style={styles.label}>
          {label}
        </Text>
        <View
          style={[
            styles.inputWrapper,
            isFocused && styles.inputWrapperFocused,
            error && styles.inputWrapperError,
          ]}
        >
          <TextInput
            ref={ref}
            testID={testID}
            style={[styles.input, style]}
            placeholderTextColor={color.textDisabled}
            secureTextEntry={isSecure}
            onFocus={(e) => {
              setIsFocused(true);
              rest.onFocus?.(e);
            }}
            onBlur={(e) => {
              setIsFocused(false);
              rest.onBlur?.(e);
            }}
            {...rest}
          />
          {secureToggle && (
            <TouchableOpacity
              testID={testID ? `${testID}-toggle-visibility` : undefined}
              accessibilityRole="button"
              accessibilityLabel={revealed ? "Ocultar senha" : "Mostrar senha"}
              hitSlop={8}
              onPress={() => setRevealed((value) => !value)}
            >
              <Ionicons
                name={revealed ? "eye-off-outline" : "eye-outline"}
                size={sizeTokens.iconMd}
                color={color.textSecondary}
              />
            </TouchableOpacity>
          )}
        </View>
        {error && (
          <Text variant="caption" color={color.danger} style={styles.error}>
            {error}
          </Text>
        )}
      </View>
    );
  },
);

TextField.displayName = "TextField";

const styles = StyleSheet.create({
  container: {
    gap: spacing.xs,
  },
  label: {
    marginLeft: spacing.xxs,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: sizeTokens.controlHeight,
    backgroundColor: color.surface,
    borderWidth: 1,
    borderColor: color.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  inputWrapperFocused: {
    borderColor: color.borderFocus,
  },
  inputWrapperError: {
    borderColor: color.danger,
  },
  input: {
    flex: 1,
    fontSize: typography.size.md,
    color: color.textPrimary,
    paddingVertical: spacing.sm,
  },
  error: {
    marginLeft: spacing.xxs,
  },
});
