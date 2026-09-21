import type { WorkspaceType } from "@mony/shared-types";
import { create } from "zustand";

interface WorkspaceState {
  activeWorkspace: WorkspaceType | null;
  setActiveWorkspace: (workspace: WorkspaceType) => void;
}

// Not persisted on purpose — re-synced from `GET /users/me` on every app
// start / login (see RootNavigator), so it never goes stale across devices.
export const useWorkspaceStore = create<WorkspaceState>((set) => ({
  activeWorkspace: null,
  setActiveWorkspace: (workspace) => set({ activeWorkspace: workspace }),
}));
