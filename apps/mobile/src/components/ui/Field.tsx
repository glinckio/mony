import type { ReactNode } from "react";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";

import { space } from "../../theme";

import { Text } from "./Text";

interface FieldProps {
  label: string;
  // Validation message; replaces the hint and turns the label red.
  error?: string;
  // Helper text under the control.
  hint?: string;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}

// A labeled slot for form controls that aren't a TextField (segmented
// controls, chip rows, pickers): muted label on top, then the control, then
// the error or hint.
export function Field({ label, error, hint, children, style }: FieldProps) {
  const note = error ?? hint;
  return (
    <View style={[styles.field, style]}>
      <Text variant="subhead" tone={error ? "danger" : "muted"}>
        {label}
      </Text>
      {children}
      {note ? (
        <Text variant="footnote" tone={error ? "danger" : "muted"}>
          {note}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  field: {
    gap: space.sm,
  },
});
