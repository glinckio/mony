import { CATEGORY_COLORS, CATEGORY_ICONS, type CategoryIcon } from "@mony/shared-types";
import { memo } from "react";
import { StyleSheet, View } from "react-native";

import { radius, space, useTheme } from "../../theme";

import { Icon } from "./Icon";
import { Touchable } from "./Touchable";

// What a screen reader says for each swatch / icon — never the hex code or
// the English Ionicons name.
const COLOR_LABELS: Record<(typeof CATEGORY_COLORS)[number], string> = {
  "#3B82F6": "Azul",
  "#EF4444": "Vermelho",
  "#10B981": "Verde",
  "#F59E0B": "Amarelo",
  "#8B5CF6": "Roxo",
  "#EC4899": "Rosa",
  "#14B8A6": "Verde-água",
  "#F97316": "Laranja",
};

const ICON_LABELS: Record<CategoryIcon, string> = {
  "cash-outline": "Dinheiro",
  "trending-up-outline": "Investimentos",
  "heart-outline": "Coração",
  "gift-outline": "Presente",
  "wallet-outline": "Carteira",
  "save-outline": "Poupança",
  "card-outline": "Cartão",
  "storefront-outline": "Loja",
  "restaurant-outline": "Restaurante",
  "home-outline": "Casa",
  "car-outline": "Carro",
  "pulse-outline": "Saúde",
  "school-outline": "Educação",
  "game-controller-outline": "Jogos",
  "bag-outline": "Compras",
  "shirt-outline": "Roupas",
  "airplane-outline": "Viagem",
  "bus-outline": "Ônibus",
  "car-sport-outline": "Carro esportivo",
  "medkit-outline": "Farmácia",
  "bandage-outline": "Curativo",
  "book-outline": "Livros",
  "laptop-outline": "Notebook",
  "phone-portrait-outline": "Celular",
  "barbell-outline": "Academia",
  "wine-outline": "Bebidas",
  "cafe-outline": "Café",
  "happy-outline": "Lazer",
  "paw-outline": "Pets",
  "construct-outline": "Manutenção",
  "bulb-outline": "Energia",
  "pricetag-outline": "Etiqueta",
  "briefcase-outline": "Trabalho",
  "receipt-outline": "Contas",
  "ellipsis-horizontal-outline": "Outros",
};

// Category color: round swatches, the chosen one with a white check and
// an outer ring. testIDs `${testID}-${hex}`. Memoized: the form re-renders
// on other fields, and these grids don't need to.
export const ColorPicker = memo(function ColorPicker({
  value,
  onChange,
  testID,
}: {
  value?: string;
  onChange: (value: string) => void;
  testID?: string;
}) {
  const { colors } = useTheme();
  return (
    <View style={styles.wrap} testID={testID} accessibilityRole="radiogroup">
      {CATEGORY_COLORS.map((swatch) => {
        const selected = swatch === value;
        return (
          <Touchable
            key={swatch}
            testID={testID ? `${testID}-${swatch}` : undefined}
            feedback="sink"
            haptic="selection"
            accessibilityRole="radio"
            accessibilityLabel={`Cor ${COLOR_LABELS[swatch]}`}
            accessibilityState={{ selected, checked: selected }}
            onPress={() => onChange(swatch)}
            style={[styles.ring, { borderColor: selected ? swatch : "transparent" }]}
          >
            <View style={[styles.swatch, { backgroundColor: swatch }]}>
              {selected ? <Icon name="checkmark" size="md" color={colors.onPrimary} /> : null}
            </View>
          </Touchable>
        );
      })}
    </View>
  );
});

// Category icon: a grid of white tiles; the chosen one in soft indigo with
// an indigo outline. testIDs `${testID}-${icon}`.
export const IconPicker = memo(function IconPicker({
  value,
  onChange,
  tint,
  testID,
}: {
  value?: string;
  onChange: (value: CategoryIcon) => void;
  // The chosen color, so the grid previews it.
  tint?: string;
  testID?: string;
}) {
  const { colors, elevation } = useTheme();
  return (
    <View style={styles.wrap} testID={testID} accessibilityRole="radiogroup">
      {CATEGORY_ICONS.map((icon) => {
        const selected = icon === value;
        return (
          <Touchable
            key={icon}
            testID={testID ? `${testID}-${icon}` : undefined}
            feedback="sink"
            haptic="selection"
            accessibilityRole="radio"
            accessibilityLabel={`Ícone ${ICON_LABELS[icon]}`}
            accessibilityState={{ selected, checked: selected }}
            onPress={() => onChange(icon)}
            style={[
              styles.tile,
              selected
                ? {
                    backgroundColor: colors.primaryMuted,
                    borderColor: colors.primary,
                    borderWidth: 1.5,
                  }
                : [{ backgroundColor: colors.surface }, elevation("sm")],
            ]}
          >
            <Icon
              name={icon}
              size="lg"
              filled={selected}
              color={selected ? (tint ?? colors.primary) : colors.textMuted}
            />
          </Touchable>
        );
      })}
    </View>
  );
});

const styles = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: space.sm + 2,
  },
  ring: {
    borderWidth: 2,
    borderRadius: radius.full,
    padding: 3,
  },
  swatch: {
    width: 40,
    height: 40,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  tile: {
    width: 52,
    height: 52,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
  },
});
