import type { ReactNode } from "react";
import { StyleSheet, View } from "react-native";

import { radius, space, useTheme } from "../../theme";

import { Button } from "./Button";
import { InlineNotice } from "./InlineNotice";
import { PaperSheet } from "./PaperSheet";
import { Text } from "./Text";

interface ConfirmSheetProps {
  visible: boolean;
  // A question naming the thing ("Excluir a meta "Viagem"?"), never "Tem certeza?".
  title: string;
  // The concrete consequence.
  message?: string;
  // Miniature of the affected object (a ledger line, a goal ruler…).
  preview?: ReactNode;
  confirmLabel: string;
  cancelLabel?: string;
  tone?: "danger" | "warning" | "primary";
  busy?: boolean;
  error?: string | null;
  onConfirm: () => void;
  onClose: () => void;
  // See PaperSheet: runs after the sheet has fully left the screen.
  onDismissed?: () => void;
  testID?: string;
}

// Confirmation for actions with consequences — replaces Alert.alert. The
// action button turns into a loader in place, and a failure shows here
// without closing. testIDs: `${testID}-confirm`, `${testID}-cancel`.
export function ConfirmSheet({
  visible,
  title,
  message,
  preview,
  confirmLabel,
  cancelLabel = "Manter",
  tone = "danger",
  busy = false,
  error,
  onConfirm,
  onClose,
  onDismissed,
  testID = "confirm-sheet",
}: ConfirmSheetProps) {
  const { colors } = useTheme();
  const toneColor =
    tone === "danger" ? colors.danger : tone === "warning" ? colors.warning : colors.primary;
  return (
    <PaperSheet
      visible={visible}
      onClose={onClose}
      onDismissed={onDismissed}
      dismissible={!busy}
      testID={testID}
    >
      {preview ? (
        <View
          style={[styles.preview, { borderColor: colors.border, backgroundColor: colors.surface }]}
        >
          <View style={[styles.previewTone, { backgroundColor: toneColor }]} />
          {preview}
        </View>
      ) : null}
      <View style={styles.copy}>
        <Text variant="title2" accessibilityRole="header">
          {title}
        </Text>
        {message ? (
          <Text variant="body" tone="muted">
            {message}
          </Text>
        ) : null}
      </View>
      {error ? <InlineNotice tone="danger" message={error} /> : null}
      <View style={styles.actions}>
        <Button
          testID={`${testID}-confirm`}
          label={confirmLabel}
          variant={tone === "danger" ? "danger" : "primary"}
          loading={busy}
          haptic="stamp"
          onPress={onConfirm}
        />
        <Button
          testID={`${testID}-cancel`}
          label={cancelLabel}
          variant="ghost"
          disabled={busy}
          onPress={onClose}
        />
      </View>
    </PaperSheet>
  );
}

const styles = StyleSheet.create({
  preview: {
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderRadius: radius.md,
    overflow: "hidden",
    paddingVertical: space.xs,
  },
  previewTone: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 3,
  },
  copy: {
    gap: space.sm,
  },
  actions: {
    gap: space.xs,
  },
});
