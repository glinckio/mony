import type { Plan } from "@mony/shared-types";
import { StyleSheet, View } from "react-native";
import Animated, { ZoomIn } from "react-native-reanimated";

import { spokenMoney } from "../../lib/money-display";
import { PLAN_LABELS, intervalLabel, type AnnualComparison } from "../../lib/subscription-display";
import { radius, space, useMotion, useTheme } from "../../theme";
import { Gradient } from "../ui/Surfaces";
import { Text } from "../ui/Text";
import { Touchable } from "../ui/Touchable";

import { MoneyHero } from "./MoneyHero";

interface PlanCardProps {
  plan: Plan;
  selected: boolean;
  // The annual plan against twelve monthly payments, when it saves.
  comparison?: AnnualComparison | null;
  onPress: () => void;
  testID?: string;
}

// One option of Assinatura's plan choice (a radio of a radiogroup): the
// radio, the plan's name with the saving as a pill, the price with a small
// "R$" and interval, and what it means per month or how it's charged.
export function PlanCard({ plan, selected, comparison, onPress, testID }: PlanCardProps) {
  const { colors, elevation } = useTheme();
  const { reduced } = useMotion();
  const name = `Plano ${PLAN_LABELS[plan.plan]}`;
  const spokenPrice = `${spokenMoney(plan.amount)} por ${intervalLabel(plan)}`;
  return (
    <Touchable
      testID={testID}
      feedback="sink"
      haptic="selection"
      accessibilityRole="radio"
      accessibilityState={{ selected, checked: selected }}
      accessibilityLabel={
        comparison
          ? `${name}, ${spokenPrice}. Melhor valor, ${comparison.spokenSaving}`
          : `${name}, ${spokenPrice}`
      }
      onPress={onPress}
      style={[
        styles.card,
        {
          backgroundColor: colors.surface,
          borderColor: selected ? colors.primary : colors.surface,
        },
        elevation(selected ? "md" : "sm"),
      ]}
    >
      <View
        style={[styles.radio, { borderColor: selected ? colors.primary : colors.borderStrong }]}
      >
        {selected ? (
          <Animated.View entering={reduced ? undefined : ZoomIn.springify().damping(14)}>
            <Gradient name="brand" style={styles.dot} />
          </Animated.View>
        ) : null}
      </View>
      <View style={styles.body}>
        <View style={styles.header}>
          <Text variant="headline" style={styles.flex}>
            {PLAN_LABELS[plan.plan]}
          </Text>
          {comparison ? (
            <View style={[styles.pill, { backgroundColor: colors.successMuted }]}>
              <Text variant="caption" color={colors.onSuccessMuted}>
                {comparison.saving}
              </Text>
            </View>
          ) : null}
        </View>
        <View style={styles.price}>
          <MoneyHero value={plan.amount} variant="numeralLarge" animate={false} />
          <Text variant="footnote" tone="muted">
            {`/${intervalLabel(plan)}`}
          </Text>
        </View>
        <Text variant="footnote" tone="muted">
          {comparison ? `Equivale a ${comparison.monthlyEquivalent}` : "Cobrado todo mês"}
        </Text>
      </View>
    </Touchable>
  );
}

const RADIO_SIZE = 24;
const DOT_SIZE = 12;

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: space.md,
    padding: space.lg,
    borderRadius: radius.lg,
    borderWidth: 2,
  },
  radio: {
    width: RADIO_SIZE,
    height: RADIO_SIZE,
    marginTop: space.xxs,
    borderRadius: radius.full,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  dot: {
    width: DOT_SIZE,
    height: DOT_SIZE,
    borderRadius: radius.full,
  },
  body: {
    flex: 1,
    gap: space.xxs,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.sm,
  },
  flex: {
    flex: 1,
  },
  pill: {
    paddingHorizontal: space.sm,
    paddingVertical: space.xxs,
    borderRadius: radius.full,
  },
  price: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: space.xxs,
  },
});
