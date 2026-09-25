import { spacing } from "@mony/ui-tokens";
import { useNavigation } from "@react-navigation/native";
import { StyleSheet, View } from "react-native";

import { AppHeader, ListRow, Screen } from "../../components/ui";
import type { MainTabNavigation } from "../../navigation/RootNavigator";

// "Mais" tab: entry point for every section that doesn't earn its own
// tab (see docs/specs/navigation/design.md → Amendment). Later features
// (Mercado, Veículos, Relatórios...) append a row here.
export function MoreScreen() {
  const navigation = useNavigation<MainTabNavigation>();

  return (
    <Screen>
      <AppHeader title="Mais" />
      <View style={styles.list}>
        <ListRow
          testID="more-categories"
          icon="pricetags-outline"
          label="Categorias"
          description="Organize receitas e despesas"
          onPress={() => navigation.navigate("Categories")}
        />
        <ListRow
          testID="more-debts"
          icon="card-outline"
          label="Dívidas"
          description="Parcelas, pagamentos e saldo devedor"
          onPress={() => navigation.navigate("Debts")}
        />
        <ListRow
          testID="more-grocery"
          icon="cart-outline"
          label="Mercado"
          description="Lista de compras e orçamento do mês"
          onPress={() => navigation.navigate("Grocery")}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: spacing.sm,
  },
});
