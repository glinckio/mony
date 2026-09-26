import type { WorkspaceType } from "@mony/shared-types";
import { useState } from "react";

import { apiFetch } from "../../lib/api-client";
import { queryClient } from "../../lib/query-client";
import { useToastStore } from "../../lib/toast-store";
import { useWorkspaceStore } from "../../lib/workspace-store";
import { SegmentedControl } from "../ui/SegmentedControl";

const OPTIONS: Array<{ value: WorkspaceType; label: string; spoken: string }> = [
  { value: "PERSONAL", label: "Pessoal", spoken: "Caderno pessoal" },
  { value: "BUSINESS", label: "Empresa", spoken: "Caderno empresarial" },
];

// The active notebook (workspace) as a small pill switch. Switching is
// optimistic — the pill moves at once and a failure moves it back with a
// toast (see docs/specs/user-profile).
export function NotebookSwitch({ variant = "default" }: { variant?: "default" | "glass" }) {
  const activeWorkspace = useWorkspaceStore((state) => state.activeWorkspace);
  const setActiveWorkspace = useWorkspaceStore((state) => state.setActiveWorkspace);
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
      // Balances, entries and goals are per notebook: refetch what's on
      // screen (only active queries refetch; the rest just go stale).
      void queryClient.invalidateQueries();
    } catch {
      if (previous) setActiveWorkspace(previous);
      useToastStore.getState().show("Não foi possível trocar de caderno. Tente novamente.");
    } finally {
      setIsSwitching(false);
    }
  };

  return (
    <SegmentedControl
      testID="workspace-switcher"
      size="sm"
      variant={variant}
      accessibilityLabel="Caderno"
      options={OPTIONS}
      // Before the profile sync lands, nothing is highlighted.
      value={(activeWorkspace ?? "") as WorkspaceType}
      onChange={handleSelect}
      disabled={isSwitching}
      optionTestID={(value) => `workspace-option-${value}`}
      optionAccessibilityLabel={(option) =>
        OPTIONS.find((candidate) => candidate.value === option.value)?.spoken ?? option.label
      }
    />
  );
}
