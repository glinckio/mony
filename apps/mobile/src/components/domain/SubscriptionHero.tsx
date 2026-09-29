import { TRIAL_DAYS } from "@mony/shared-types";
import type { ReactNode } from "react";
import { StyleSheet, View } from "react-native";

import type { SubscriptionCopy } from "../../lib/subscription-display";
import { radius, space, useTheme } from "../../theme";
import { Icon } from "../ui/Icon";
import { Gradient, ProgressBar } from "../ui/Surfaces";
import { Text } from "../ui/Text";

import { HeroDecoration } from "./HeroDecoration";

interface SubscriptionHeroProps {
  copy: SubscriptionCopy;
  // The live plan's price ("R$ 65,34/ano").
  price?: string | null;
  // The trial's progress, while in it.
  trial?: { percent: number; day: number; daysLeft: number } | null;
  // The offer: what the plan includes (legacy's comparison table).
  features?: readonly string[];
  children?: ReactNode;
  testID?: string;
}

const daysLeftCopy = (days: number) =>
  days === 0 ? "último dia" : days === 1 ? "falta 1 dia" : `faltam ${days} dias`;

// Assinatura's hero, in the brand gradient with the glass light: the
// status as a glass chip, then either the live plan (price, trial bar,
// renewal/end date) or the offer (7 days free, what's included).
export function SubscriptionHero({
  copy,
  price,
  trial,
  features,
  children,
  testID,
}: SubscriptionHeroProps) {
  const { colors, elevation } = useTheme();
  const spoken = [copy.status, copy.headline, price, copy.message].filter(Boolean).join(". ");
  return (
    <View style={[styles.shadow, elevation("md")]}>
      <Gradient name="balance" style={styles.hero}>
        <HeroDecoration />
        <View style={styles.content}>
          <View
            testID={testID}
            accessible
            accessibilityRole="summary"
            accessibilityLabel={spoken}
            style={styles.summary}
          >
            <View
              style={[
                styles.chip,
                copy.alert
                  ? { backgroundColor: colors.surface, borderColor: colors.surface }
                  : { backgroundColor: colors.glassFill, borderColor: colors.glassBorder },
              ]}
            >
              <Icon
                name={copy.icon}
                size="sm"
                color={copy.alert ? colors.warning : colors.onGlass}
              />
              <Text variant="label" color={copy.alert ? colors.text : colors.onGlass}>
                {copy.chip}
              </Text>
            </View>
            <View style={styles.headline}>
              <Text variant="title1" color={colors.onGlass}>
                {copy.headline}
              </Text>
              {price ? (
                <Text variant="headline" color={colors.onGlassMuted}>
                  {price}
                </Text>
              ) : null}
            </View>
            {trial ? (
              <View style={styles.trial}>
                <ProgressBar percent={trial.percent} tone="glass" height={6} />
                <Text variant="caption" color={colors.onGlassMuted}>
                  {`Dia ${trial.day} de ${TRIAL_DAYS} · ${daysLeftCopy(trial.daysLeft)}`}
                </Text>
              </View>
            ) : null}
            <Text variant="callout" color={colors.onGlassMuted}>
              {copy.message}
            </Text>
          </View>
          {features?.length ? (
            <View style={styles.features}>
              {features.map((feature) => (
                <View key={feature} style={styles.feature}>
                  <View
                    style={[
                      styles.check,
                      { backgroundColor: colors.glassFill, borderColor: colors.glassBorder },
                    ]}
                  >
                    <Icon name="checkmark" size="sm" color={colors.onGlass} />
                  </View>
                  <Text variant="body" color={colors.onGlass} style={styles.flex}>
                    {feature}
                  </Text>
                </View>
              ))}
            </View>
          ) : null}
          {children}
        </View>
      </Gradient>
    </View>
  );
}

const CHECK_SIZE = 24;

const styles = StyleSheet.create({
  shadow: {
    borderRadius: radius.xl,
  },
  hero: {
    borderRadius: radius.xl,
    overflow: "hidden",
  },
  content: {
    padding: space.xl,
    gap: space.lg,
  },
  summary: {
    gap: space.md,
  },
  chip: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: space.xs,
    paddingHorizontal: space.sm + 2,
    paddingVertical: space.xs,
    borderRadius: radius.full,
    borderWidth: 1,
  },
  headline: {
    gap: space.xxs,
  },
  trial: {
    gap: space.xs,
  },
  features: {
    gap: space.sm,
  },
  feature: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.sm,
  },
  check: {
    width: CHECK_SIZE,
    height: CHECK_SIZE,
    borderRadius: radius.full,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  flex: {
    flex: 1,
  },
});
