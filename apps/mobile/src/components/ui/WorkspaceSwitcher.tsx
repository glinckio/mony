import type { WorkspaceType } from "@mony/shared-types";
import { color, radius, spacing } from "@mony/ui-tokens";
import { useState } from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";

import { apiFetch } from "../../lib/api-client";
import { useToastStore } from "../../lib/toast-store";
import { useWorkspaceStore } from "../../lib/workspace-store";

import { Text } from "./Text";

const OPTIONS: Array<{ value: WorkspaceType; label: string }> = [
  { value: "PERSONAL", label: "Pessoal" },
  { value: "BUSINESS", label: "Empresarial" },
];

// App-wide, persistent toggle (not buried in the profile screen) — matches
// how central the workspace is in the legacy app, see design.md.
export function WorkspaceSwitcher() {
  const activeWorkspace = useWorkspaceStore((state) => state.activeWorkspace);
  const setActiveWorkspace = useWorkspaceStore((state) => state.setActiveWorkspace);
  // Disables the control mid-flight so a second tap can't fire while a
  // switch is still in flight and later stomp its result on revert.
  const [isSwitching, setIsSwitching] = useState(false);

  const handleSelect = async (workspace: WorkspaceType) => {
    if (workspace === activeWorkspace || isSwitching) return;

    const previous = activeWorkspace;
    setActiveWorkspace(workspace);
    setIsSwitching(true);
    try {
      await apiFetch("/users/me/workspace", {
        method: "PATCH",
        body: JSON.stringify({ workspace }),
      });
    } catch {
      // Low-stakes, frequent action — optimistic UI, revert + toast on
      // failure instead of blocking on a round trip up front.
      if (previous) setActiveWorkspace(previous);
      useToastStore.getState().show("Não foi possível trocar o workspace. Tente novamente.");
    } finally {
      setIsSwitching(false);
    }
  };

  return (
    <View style={styles.container} testID="workspace-switcher">
      {OPTIONS.map((option) => {
        const selected = option.value === activeWorkspace;
        return (
          <TouchableOpacity
            key={option.value}
            testID={`workspace-option-${option.value}`}
            accessibilityRole="button"
            accessibilityState={{ selected, disabled: isSwitching }}
            disabled={isSwitching}
            style={[styles.option, selected && styles.optionSelected]}
            onPress={() => handleSelect(option.value)}
          >
            <Text variant="caption" color={selected ? color.onPrimary : color.textSecondary}>
              {option.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    backgroundColor: color.surfaceAlt,
    borderRadius: radius.md,
    padding: spacing.xxs,
    alignSelf: "flex-start",
  },
  option: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: radius.sm,
  },
  optionSelected: {
    backgroundColor: color.primary,
  },
});
