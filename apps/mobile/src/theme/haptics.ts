import * as Haptics from "expo-haptics";
import { Platform } from "react-native";

const ignore = () => undefined;
const enabled = Platform.OS === "ios" || Platform.OS === "android";

// Named by intent (see design/style-guide.md → Movimento → Haptics), so
// every screen uses the same feel for the same kind of action.
export const haptic = {
  // Tab, period, notebook and chip changes.
  selection: () => {
    if (enabled) Haptics.selectionAsync().catch(ignore);
  },
  // Grocery stepper.
  tick: () => {
    if (enabled) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(ignore);
  },
  // The stamp slamming, entering selection mode.
  stamp: () => {
    if (enabled) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(ignore);
  },
  // Moments: transaction logged, debt paid off, goal reached.
  success: () => {
    if (enabled) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(ignore);
  },
  // A form submit that failed.
  error: () => {
    if (enabled) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(ignore);
  },
};
