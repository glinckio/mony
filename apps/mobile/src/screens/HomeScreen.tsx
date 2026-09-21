import { Ionicons } from "@expo/vector-icons";
import { color, size as sizeTokens, spacing } from "@mony/ui-tokens";
import { useNavigation } from "@react-navigation/native";
import { useState } from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";

import { AppHeader, Button, Screen, Text } from "../components/ui";
import { logout } from "../lib/api-client";
import { useAuthStore } from "../lib/auth-store";
import type { AppStackNavigation } from "../navigation/RootNavigator";

export function HomeScreen() {
  const navigation = useNavigation<AppStackNavigation>();
  const user = useAuthStore((state) => state.user);
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = async () => {
    setLoggingOut(true);
    await logout();
    // No need to reset `loggingOut` on success — clearSession() flips
    // the app back to the auth stack and this screen unmounts.
  };

  return (
    <Screen scrollable={false} keyboardAvoiding={false}>
      <AppHeader
        title="Início"
        rightAccessory={
          <TouchableOpacity
            testID="header-profile-button"
            accessibilityRole="button"
            hitSlop={8}
            onPress={() => navigation.navigate("Profile")}
          >
            <Ionicons name="person-circle-outline" size={sizeTokens.iconLg} color={color.primary} />
          </TouchableOpacity>
        }
      />

      <View style={styles.content}>
        <Text variant="heading" style={styles.centerText}>
          Bem-vindo, {user?.name}
        </Text>
        <Text variant="caption" style={styles.centerText}>
          O painel chega numa próxima etapa.
        </Text>
        <View style={styles.categoriesButton}>
          <Button
            testID="go-to-transactions"
            label="Transações"
            onPress={() => navigation.navigate("Transactions")}
          />
        </View>
        <View style={styles.categoriesButton}>
          <Button
            testID="go-to-categories"
            label="Categorias"
            variant="secondary"
            onPress={() => navigation.navigate("Categories")}
          />
        </View>
        <View style={styles.categoriesButton}>
          <Button
            testID="go-to-goals"
            label="Metas"
            variant="secondary"
            onPress={() => navigation.navigate("Goals")}
          />
        </View>
        <View style={styles.logoutButton}>
          <Button
            testID="logout-button"
            label="Sair"
            variant="secondary"
            loading={loggingOut}
            onPress={handleLogout}
          />
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
    justifyContent: "center",
  },
  centerText: {
    textAlign: "center",
  },
  categoriesButton: {
    marginTop: spacing.lg,
  },
  logoutButton: {
    marginTop: spacing.md,
  },
});
