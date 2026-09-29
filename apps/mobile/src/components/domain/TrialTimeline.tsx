import { StyleSheet, View } from "react-native";

import { formatMoney } from "../../lib/money-display";
import { radius, space, useTheme } from "../../theme";
import { Card, Gradient } from "../ui/Surfaces";
import { Text } from "../ui/Text";

interface TrialTimelineProps {
  // Last day to cancel without paying, and the first charge's day ("dd/mm").
  cancelBy: string;
  chargeOn: string;
  // The selected plan's price and interval ("ano" / "mês").
  amount: string;
  interval: string;
  testID?: string;
}

// How the free trial plays out, as legacy's FAQ explained it: today
// nothing is charged, cancel before the end and pay nothing, then the
// first charge. A rail of dots: today filled with the brand gradient,
// the future as rings.
export function TrialTimeline({
  cancelBy,
  chargeOn,
  amount,
  interval,
  testID,
}: TrialTimelineProps) {
  const { colors } = useTheme();
  const steps = [
    { when: "Hoje", what: "Acesso completo, sem cobrança." },
    { when: `Até ${cancelBy}`, what: "Cancele quando quiser e não paga nada." },
    {
      when: chargeOn,
      what: `Cobrança de ${formatMoney(amount)}, e depois todo ${interval}.`,
    },
  ];
  return (
    <Card testID={testID}>
      {steps.map((step, index) => {
        const last = index === steps.length - 1;
        return (
          <View
            key={step.when}
            style={styles.row}
            accessible
            accessibilityLabel={`${step.when}: ${step.what}`}
          >
            <View style={styles.rail}>
              {index === 0 ? (
                <Gradient name="brand" style={styles.dot} />
              ) : (
                <View style={[styles.dot, styles.ring, { borderColor: colors.primary }]} />
              )}
              {last ? null : <View style={[styles.line, { backgroundColor: colors.border }]} />}
            </View>
            <View style={[styles.text, last ? null : styles.gap]}>
              <Text variant="bodyStrong">{step.when}</Text>
              <Text variant="callout" tone="muted">
                {step.what}
              </Text>
            </View>
          </View>
        );
      })}
    </Card>
  );
}

const DOT_SIZE = 14;

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    gap: space.md,
  },
  rail: {
    width: DOT_SIZE,
    alignItems: "center",
    // Centers the dot on the first line of the label.
    paddingTop: space.xs,
  },
  dot: {
    width: DOT_SIZE,
    height: DOT_SIZE,
    borderRadius: radius.full,
  },
  ring: {
    borderWidth: 2,
  },
  line: {
    flex: 1,
    width: 2,
    marginTop: space.xs,
    borderRadius: radius.full,
  },
  text: {
    flex: 1,
    gap: space.xxs,
  },
  gap: {
    paddingBottom: space.lg,
  },
});
