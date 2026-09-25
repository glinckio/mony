import { Ionicons } from "@expo/vector-icons";
import { color, radius, shadow, size as sizeTokens, spacing } from "@mony/ui-tokens";
import type { ReactNode } from "react";
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Text } from "./Text";

interface BottomSheetProps {
  visible: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  testID?: string;
}

// Modal sheet anchored to the bottom over an `overlay` backdrop — for
// short, focused forms that belong to the screen underneath (e.g. paying
// a debt installment) rather than a full modal route. Tapping the
// backdrop or the close icon dismisses it.
//
// Uses KeyboardAvoidingView (not `Screen`'s ScrollView inset approach)
// because a RN `Modal` is its own native window with no ScrollView to
// hand keyboard insets to — padding the sheet up is the standard pattern
// here, and the sheet's content is short enough that it doesn't need to
// scroll.
export function BottomSheet({ visible, title, onClose, children, testID }: BottomSheetProps) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <Pressable
          style={styles.backdrop}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Fechar"
          testID={testID ? `${testID}-backdrop` : undefined}
        />
        <SafeAreaView edges={["bottom"]} style={styles.sheet} testID={testID}>
          <View style={styles.content}>
            <View style={styles.header}>
              <Text variant="title" style={styles.title}>
                {title}
              </Text>
              <TouchableOpacity
                testID={testID ? `${testID}-close` : undefined}
                accessibilityRole="button"
                accessibilityLabel="Fechar"
                hitSlop={8}
                onPress={onClose}
              >
                <Ionicons name="close-outline" size={sizeTokens.iconLg} color={color.textPrimary} />
              </TouchableOpacity>
            </View>
            {children}
          </View>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  backdrop: {
    flex: 1,
    backgroundColor: color.overlay,
  },
  sheet: {
    backgroundColor: color.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    ...shadow.md,
  },
  content: {
    width: "100%",
    maxWidth: sizeTokens.maxContentWidth,
    alignSelf: "center",
    padding: spacing.lg,
    gap: spacing.md,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  title: {
    flex: 1,
  },
});
