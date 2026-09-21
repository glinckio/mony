import { color, size as sizeTokens, spacing } from "@mony/ui-tokens";
import type { ReactNode } from "react";
import {
  Keyboard,
  Platform,
  ScrollView,
  StyleSheet,
  TouchableWithoutFeedback,
  View,
  type ViewStyle,
} from "react-native";
import { SafeAreaView, type Edge } from "react-native-safe-area-context";

interface ScreenProps {
  children: ReactNode;
  scrollable?: boolean;
  keyboardAvoiding?: boolean;
  edges?: Edge[];
  contentStyle?: ViewStyle;
  centered?: boolean;
}

// Every screen in the app renders through this component instead of
// hand-rolling SafeAreaView/KeyboardAvoidingView — see
// docs/steering/design-system.md "Screen composition".
export function Screen({
  children,
  scrollable = true,
  keyboardAvoiding = true,
  edges = ["top", "bottom"],
  contentStyle,
  centered = false,
}: ScreenProps) {
  // Deliberately not `KeyboardAvoidingView` — its manual padding/height
  // math repeatedly came out misaligned in practice (content ending up
  // half-behind/half-above the keyboard), including nested inside a
  // native-stack modal presentation. `automaticallyAdjustKeyboardInsets`
  // hands the whole thing to UIKit's own keyboard-avoidance instead,
  // which is what the OS's native inset animation actually uses — no
  // manual measurement to get wrong. iOS-only (RN 0.71+); on Android the
  // window already resizes natively (Expo's default
  // `windowSoftInputMode`/`softwareKeyboardLayoutMode` is "resize"), so
  // neither platform needs `KeyboardAvoidingView` here at all.
  const content = scrollable ? (
    <ScrollView
      contentContainerStyle={[styles.content, centered && styles.centered, contentStyle]}
      keyboardShouldPersistTaps="handled"
      automaticallyAdjustKeyboardInsets={keyboardAvoiding && Platform.OS === "ios"}
    >
      {children}
    </ScrollView>
  ) : (
    <View style={[styles.content, styles.flex, centered && styles.centered, contentStyle]}>
      {children}
    </View>
  );

  // Tapping anywhere that isn't itself a touchable (a button, an input,
  // etc. — those still claim the touch first) dismisses the keyboard.
  // `keyboardShouldPersistTaps="handled"` above is what lets a tap on an
  // actual input/button inside the ScrollView still register normally.
  return (
    <SafeAreaView style={styles.safeArea} edges={edges}>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
        {content}
      </TouchableWithoutFeedback>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: color.background,
  },
  flex: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    width: "100%",
    maxWidth: sizeTokens.maxContentWidth,
    alignSelf: "center",
    padding: spacing.lg,
    gap: spacing.md,
  },
  centered: {
    justifyContent: "center",
  },
});
