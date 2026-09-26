import { formatCurrency, type GroceryItem } from "@mony/shared-types";
import { memo, useEffect, useRef } from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from "react-native-reanimated";

import { formatQuantity } from "../../lib/grocery-display";
import { radius, space, useMotion, useTheme } from "../../theme";
import { IconButton } from "../ui/IconButton";
import { ProgressBar } from "../ui/Surfaces";
import { Text } from "../ui/Text";
import { Touchable } from "../ui/Touchable";

import { StatusPill } from "./StatusPill";

interface PantryItemProps {
  item: GroceryItem;
  onStep: (itemId: string, delta: 1 | -1) => void;
  onEdit: (item: GroceryItem) => void;
}

// A pantry item as a white card row: name (+ "Faltando" pill), how much
// there is of how much is needed, a thin stock bar, and the −/+ stepper
// whose number gives a little hop on every change.
export const PantryItem = memo(function PantryItem({ item, onStep, onEdit }: PantryItemProps) {
  const { colors, elevation } = useTheme();
  const { reduced } = useMotion();
  const current = Number(item.currentQuantity);
  const ideal = Number(item.idealQuantity);
  const atZero = current <= 0;
  const stock = ideal > 0 ? Math.min(100, (current / ideal) * 100) : 100;
  const hop = useSharedValue(1);
  const previousQuantity = useRef(item.currentQuantity);

  // Hop only when the quantity actually changes — not on mount, so a list
  // of rows scrolling into view doesn't start a burst of animations.
  useEffect(() => {
    if (previousQuantity.current === item.currentQuantity) return;
    previousQuantity.current = item.currentQuantity;
    if (reduced) return;
    hop.value = withSequence(withTiming(1.2, { duration: 90 }), withTiming(1, { duration: 140 }));
  }, [item.currentQuantity, reduced, hop]);

  const hopStyle = useAnimatedStyle(() => ({ transform: [{ scale: hop.value }] }));

  return (
    <View
      testID={`grocery-row-${item.id}`}
      style={[styles.card, { backgroundColor: colors.surface }, elevation("sm")]}
    >
      <Touchable
        feedback="fade"
        style={styles.main}
        accessibilityRole="button"
        accessibilityLabel={`Editar ${item.name}`}
        onPress={() => onEdit(item)}
      >
        <View style={styles.titleRow}>
          <Text variant="bodyStrong" numberOfLines={1} style={styles.name}>
            {item.name}
          </Text>
          {item.missing ? (
            <View testID={`grocery-missing-${item.id}`}>
              <StatusPill kind="missing" />
            </View>
          ) : null}
        </View>
        <Text variant="footnote" tone="muted" numberOfLines={1}>
          {formatQuantity(item.currentQuantity)} de {formatQuantity(item.idealQuantity)} {item.unit}{" "}
          · {formatCurrency(item.estimatedPrice)}/{item.unit}
        </Text>
        <ProgressBar
          percent={stock}
          height={5}
          tone={item.missing ? "warning" : "success"}
          accessibilityLabel={`Estoque de ${item.name}`}
        />
      </Touchable>
      <View style={styles.stepper}>
        <IconButton
          testID={`grocery-decrement-${item.id}`}
          icon="remove"
          variant="ink"
          haptic="tick"
          accessibilityLabel={`Diminuir ${item.name}`}
          disabled={atZero}
          onPress={() => onStep(item.id, -1)}
        />
        <Animated.View style={[styles.quantity, hopStyle]}>
          <Text variant="numeral" align="center" numberOfLines={1}>
            {formatQuantity(item.currentQuantity)}
          </Text>
        </Animated.View>
        <IconButton
          testID={`grocery-increment-${item.id}`}
          icon="add"
          variant="ink"
          haptic="tick"
          accessibilityLabel={`Aumentar ${item.name}`}
          onPress={() => onStep(item.id, 1)}
        />
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
    padding: space.md,
    paddingLeft: space.lg,
    borderRadius: radius.lg,
  },
  main: {
    flex: 1,
    gap: space.xs,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.sm,
  },
  name: {
    flexShrink: 1,
  },
  stepper: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.xs,
  },
  quantity: {
    minWidth: 32,
  },
});
