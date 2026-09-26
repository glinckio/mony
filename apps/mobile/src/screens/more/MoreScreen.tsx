import { CATEGORY_COLORS } from "@mony/shared-types";
import { useNavigation } from "@react-navigation/native";
import { useState, type ReactNode } from "react";
import { StyleSheet, View } from "react-native";

import { Initials } from "../../components/domain";
import { Card, Icon, MenuRow, ScrollScreen, Text, Touchable } from "../../components/ui";
import { logout } from "../../lib/api-client";
import { useAuthStore } from "../../lib/auth-store";
import type { MainTabNavigation } from "../../navigation/RootNavigator";
import { radius, space, useTheme } from "../../theme";

// Badge hues from the fixed category palette (blue, green, violet, orange).
const [BLUE, , GREEN, , VIOLET, , , ORANGE] = CATEGORY_COLORS;

// Mais (design/telas.md §8): the account card on top, then the app's other
// sections grouped in white cards — the house, the money, the account.
// Later features (Relatórios, Assinatura…) append a row here.
export function MoreScreen() {
  const navigation = useNavigation<MainTabNavigation>();
  const { colors, elevation } = useTheme();
  const user = useAuthStore((state) => state.user);
  const [leaving, setLeaving] = useState(false);

  return (
    <ScrollScreen title="Mais">
      <Touchable
        testID="more-profile"
        feedback="sink"
        accessibilityRole="button"
        accessibilityLabel={`Perfil de ${user?.name ?? "você"}. Nome, e-mail, telefones e senha`}
        onPress={() => navigation.navigate("Profile")}
        style={[styles.account, { backgroundColor: colors.surface }, elevation("md")]}
      >
        <Initials name={user?.name} size={56} />
        <View style={styles.flex}>
          <Text variant="title3" numberOfLines={1}>
            {user?.name ?? "Seu perfil"}
          </Text>
          <Text variant="footnote" tone="muted" numberOfLines={1}>
            {user?.email ?? "Nome, e-mail, telefones e senha"}
          </Text>
        </View>
        <Icon name="chevron-forward" size="md" color={colors.textSubtle} />
      </Touchable>

      <Group title="A casa">
        <MenuRow
          testID="more-grocery"
          icon="cart-outline"
          color={GREEN}
          label="Mercado"
          description="Lista de compras e orçamento do mês"
          onPress={() => navigation.navigate("Grocery")}
        />
        <MenuRow
          testID="more-vehicles"
          icon="car-sport-outline"
          color={ORANGE}
          label="Veículos"
          description="Quilometragem e dados dos seus veículos"
          onPress={() => navigation.navigate("Vehicles")}
          divider
        />
      </Group>

      <Group title="O dinheiro">
        <MenuRow
          testID="more-debts"
          icon="card-outline"
          color={VIOLET}
          label="Dívidas"
          description="Parcelas, pagamentos e saldo devedor"
          onPress={() => navigation.navigate("Debts")}
        />
        <MenuRow
          testID="more-categories"
          icon="pricetags-outline"
          color={BLUE}
          label="Categorias"
          description="Organize receitas e despesas"
          onPress={() => navigation.navigate("Categories")}
          divider
        />
      </Group>

      <Group title="Conta">
        <MenuRow
          testID="more-change-password"
          icon="lock-closed-outline"
          label="Alterar senha"
          onPress={() => navigation.navigate("ChangePassword")}
        />
        <MenuRow
          testID="logout-button"
          icon="log-out-outline"
          label={leaving ? "Saindo…" : "Sair"}
          description="Encerrar a sessão neste aparelho"
          tone="danger"
          divider
          onPress={() => {
            if (leaving) return;
            setLeaving(true);
            void logout();
          }}
        />
      </Group>
    </ScrollScreen>
  );
}

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={styles.group}>
      <Text variant="title2" accessibilityRole="header">
        {title}
      </Text>
      <Card padded={false}>{children}</Card>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    gap: 2,
  },
  account: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.lg,
    padding: space.lg,
    borderRadius: radius.lg,
    marginBottom: space["2xl"],
  },
  group: {
    gap: space.md,
    marginBottom: space["2xl"],
  },
});
