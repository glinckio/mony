import { color, spacing, typography } from "@mony/ui-tokens";
import { StatusBar } from "expo-status-bar";
import { SafeAreaView, StyleSheet, Text, View } from "react-native";

export default function App() {
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      <View style={styles.content}>
        <Text style={styles.title}>Mony</Text>
        <Text style={styles.subtitle}>Mobile app scaffold — Phase 0</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: color.background,
  },
  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
  },
  title: {
    color: color.textPrimary,
    fontSize: typography.size.xl,
    fontWeight: typography.weight.bold,
  },
  subtitle: {
    color: color.textSecondary,
    fontSize: typography.size.md,
  },
});
