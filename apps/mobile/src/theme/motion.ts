import { tokens } from "@mony/ui-tokens";
import { useSyncExternalStore } from "react";
import { AccessibilityInfo } from "react-native";

import { useDesignLab } from "../dev/design-lab";
import { DEV_TOOLS_ENABLED } from "../dev/flags";

export const motionTokens = tokens.motion;

// The OS "reduce motion" setting, read once for the whole app: dozens of
// animated pieces (every Touchable row, pill, chart bar) ask for it, and a
// per-instance AccessibilityInfo query + listener each would add up.
let systemReduced = false;
let listening = false;
const listeners = new Set<() => void>();

function setSystemReduced(value: boolean) {
  if (value === systemReduced) return;
  systemReduced = value;
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  if (!listening) {
    listening = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then(setSystemReduced)
      .catch(() => undefined);
    AccessibilityInfo.addEventListener("reduceMotionChanged", setSystemReduced);
  }
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

const getSystemReduced = () => systemReduced;

// Single source for "should this move?" — the OS setting, overridable from
// the DesignLab in dev. Every effect reads this: ambient backgrounds freeze
// on a still frame, numbers swap instead of counting, stamps fade instead
// of slamming.
export function useMotion(): { reduced: boolean } {
  const reduced = useSyncExternalStore(subscribe, getSystemReduced);
  const labMotion = useDesignLab((state) => state.motion);
  const forced = DEV_TOOLS_ENABLED && labMotion === "reduced";
  return { reduced: forced || reduced };
}
