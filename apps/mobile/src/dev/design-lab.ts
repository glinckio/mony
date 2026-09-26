import { create } from "zustand";

import { DEV_TOOLS_ENABLED, MOCKS_BY_DEFAULT } from "./flags";

// Global dev-only state that drives the Screen Catalog: which data state
// the mock backend serves, the motion override, and simulated device
// insets (the web has none, and the Android emulator has no island).
export type LabDataState = "normal" | "empty" | "loading" | "error";
export type LabMotion = "system" | "reduced";
export type LabDevice = "real" | "island" | "android";

interface DesignLabState {
  dataState: LabDataState;
  motion: LabMotion;
  device: LabDevice;
  useMocks: boolean;
  set: (patch: Partial<Omit<DesignLabState, "set">>) => void;
}

export const useDesignLab = create<DesignLabState>((set) => ({
  dataState: "normal",
  motion: "system",
  device: "real",
  useMocks: DEV_TOOLS_ENABLED && MOCKS_BY_DEFAULT,
  set: (patch) => set(patch),
}));

// Simulated safe-area insets per device preset (see
// .claude/skills/app-design/references/12-bordas-e-teclado.md).
export const SIMULATED_INSETS: Record<
  Exclude<LabDevice, "real">,
  {
    top: number;
    bottom: number;
    left: number;
    right: number;
  }
> = {
  island: { top: 59, bottom: 34, left: 0, right: 0 },
  android: { top: 32, bottom: 24, left: 0, right: 0 },
};
