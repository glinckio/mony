import { color } from "@mony/ui-tokens";
import { StyleSheet } from "react-native";

import { Screen, Text } from "../components/ui";
import { useAuthStore } from "../lib/auth-store";

export function HomeScreen() {
  const user = useAuthStore((state) => state.user);

  return (
    <Screen scrollable={false} keyboardAvoiding={false} centered>
      <Text variant="heading" style={styles.centerText}>
        Bem-vindo, {user?.name}
      </Text>
      <Text variant="caption" color={color.textSecondary} style={styles.centerText}>
        O painel chega numa próxima etapa.
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  centerText: {
    textAlign: "center",
  },
});
