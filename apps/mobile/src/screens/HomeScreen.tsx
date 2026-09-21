import { color, spacing, typography } from "@mony/ui-tokens";
import { StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useAuthStore } from "../lib/auth-store";

export function HomeScreen() {
  const user = useAuthStore((state) => state.user);

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
      <View style={styles.container}>
        <Text style={styles.title}>Bem-vindo, {user?.name}</Text>
        <Text style={styles.subtitle}>O painel chega numa próxima etapa.</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: color.background,
  },
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
  },
  title: {
    color: color.textPrimary,
    fontSize: typography.size.lg,
    fontWeight: typography.weight.bold,
  },
  subtitle: {
    color: color.textSecondary,
    fontSize: typography.size.md,
  },
});
