import { forwardRef, useState, type ReactNode } from "react";
import {
  Platform,
  StyleSheet,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type ViewStyle,
} from "react-native";

import { layout, radius, space, useTheme } from "../../theme";

import { Icon, type IconName } from "./Icon";
import { IconButton } from "./IconButton";
import { Text, typeStyle } from "./Text";

export interface TextFieldProps extends TextInputProps {
  label: string;
  error?: string;
  hint?: string;
  // Adds an eye button that reveals/hides a password field.
  secureToggle?: boolean;
  leftIcon?: IconName;
  rightAccessory?: ReactNode;
  containerStyle?: StyleProp<ViewStyle>;
}

// Label on top, paper field, ink border on focus, the error below with its
// icon (validated on blur/submit by the form). Keyboard appearance follows
// the theme.
export const TextField = forwardRef<TextInput, TextFieldProps>(function TextField(
  {
    label,
    error,
    hint,
    secureToggle = false,
    secureTextEntry,
    leftIcon,
    rightAccessory,
    containerStyle,
    editable = true,
    multiline,
    onFocus,
    onBlur,
    style,
    testID,
    ...rest
  },
  ref,
) {
  const { colors, scheme, elevation } = useTheme();
  const [focused, setFocused] = useState(false);
  const [hidden, setHidden] = useState(true);

  const borderColor = error ? colors.danger : focused ? colors.primary : colors.border;
  // The focus shadow's props stay on the field at rest, zeroed: if they
  // only appeared on focus (`elevation`, `shadowColor`), Android (New
  // Architecture) rebuilt the input's parent view and the input lost focus
  // at once — the keyboard never opened.
  const shadow = elevation("sm");
  const restingShadow =
    Platform.OS === "android" ? { ...shadow, elevation: 0 } : { ...shadow, shadowOpacity: 0 };

  return (
    <View style={[styles.container, containerStyle]}>
      <Text variant="subhead" tone={error ? "danger" : "muted"}>
        {label}
      </Text>
      <View
        style={[
          styles.field,
          multiline && styles.multiline,
          {
            borderColor,
            borderWidth: focused || error ? 1.5 : 1,
            backgroundColor: editable ? colors.surface : colors.surfaceMuted,
          },
          focused && editable ? shadow : restingShadow,
        ]}
      >
        {leftIcon ? (
          <View style={styles.leftIcon}>
            <Icon name={leftIcon} size="md" color={focused ? colors.primary : colors.textSubtle} />
          </View>
        ) : null}
        <TextInput
          ref={ref}
          testID={testID}
          accessibilityLabel={label}
          accessibilityHint={error}
          editable={editable}
          multiline={multiline}
          secureTextEntry={secureToggle ? hidden : secureTextEntry}
          placeholderTextColor={colors.textSubtle}
          keyboardAppearance={scheme}
          selectionColor={colors.primary}
          cursorColor={colors.primary}
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
            typeStyle("body"),
            { color: editable ? colors.text : colors.textSubtle },
            multiline && styles.inputMultiline,
            style,
          ]}
          {...rest}
        />
        {secureToggle && (
          <IconButton
            testID={testID ? `${testID}-toggle-visibility` : undefined}
            icon={hidden ? "eye-outline" : "eye-off-outline"}
            accessibilityLabel={hidden ? "Mostrar senha" : "Ocultar senha"}
            onPress={() => setHidden((value) => !value)}
          />
        )}
        {rightAccessory}
      </View>
      {error ? (
        <View style={styles.message}>
          <Icon name="alert-circle" size="sm" color={colors.danger} />
          <Text variant="footnote" tone="danger" style={styles.messageText}>
            {error}
          </Text>
        </View>
      ) : hint ? (
        <Text variant="footnote" tone="muted">
          {hint}
        </Text>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    gap: space.xs + 2,
  },
  field: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: layout.controlHeight,
    borderRadius: radius.md,
    paddingLeft: space.lg,
  },
  multiline: {
    alignItems: "flex-start",
    minHeight: 96,
  },
  leftIcon: {
    marginRight: space.sm,
  },
  input: {
    flex: 1,
    paddingVertical: space.md,
    paddingRight: space.lg,
  },
  inputMultiline: {
    textAlignVertical: "top",
  },
  message: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: space.xs,
  },
  messageText: {
    flex: 1,
  },
});
