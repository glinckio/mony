import { spacing } from "@mony/ui-tokens";
import { useState } from "react";
import { StyleSheet, View } from "react-native";

import { Button, Screen, Text } from "../components/ui";
import { logout } from "../lib/api-client";
import { useAuthStore } from "../lib/auth-store";

export function HomeScreen() {
  const user = useAuthStore((state) => state.user);
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = async () => {
    setLoggingOut(true);
    await logout();
    // No need to reset `loggingOut` on success — clearSession() flips
    // the app back to the auth stack and this screen unmounts.
  };

  return (
    <Screen scrollable={false} keyboardAvoiding={false} centered>
      <Text variant="heading" style={styles.centerText}>
        Bem-vindo, {user?.name}
      </Text>
      <Text variant="caption" style={styles.centerText}>
        O painel chega numa próxima etapa.
      </Text>
      <View style={styles.logoutButton}>
        <Button
          testID="logout-button"
          label="Sair"
          variant="secondary"
          loading={loggingOut}
          onPress={handleLogout}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  centerText: {
    textAlign: "center",
  },
  logoutButton: {
    marginTop: spacing.lg,
  },
});
