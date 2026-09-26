import type { TypeVariant } from "@mony/ui-tokens";
import type { StyleProp, TextStyle } from "react-native";

import { MINUS, spokenMoney, splitMoney } from "../../lib/money-display";
import { useCountUp } from "../effects/CountUp";
import { Text, type TextTone } from "../ui/Text";

type HeroVariant = Extract<TypeVariant, "display" | "title1" | "amountInput" | "numeralLarge">;

interface MoneyHeroProps {
  value: string | number;
  variant?: HeroVariant;
  tone?: TextTone;
  color?: string;
  // Counts from the previous value to the new one when data changes.
  animate?: boolean;
  accessibilityLabel?: string;
  style?: StyleProp<TextStyle>;
  testID?: string;
}

// "R$" and the cents are printed a step smaller than the reais.
const SMALL: Record<HeroVariant, TypeVariant> = {
  display: "title2",
  title1: "headline",
  amountInput: "title2",
  numeralLarge: "footnote",
};

// Long amounts drop one size instead of shrinking to fit — Android
// clips glyphs when a font is scaled inside a fixed line height.
const STEP_DOWN: Record<HeroVariant, HeroVariant> = {
  display: "title1",
  amountInput: "title1",
  title1: "numeralLarge",
  numeralLarge: "numeralLarge",
};

// A hero amount: "R$" and the cents smaller than the reais, tabular
// figures, a real minus sign when negative. The smaller runs are inline
// (no line height of their own), so nothing gets clipped on Android.
export function MoneyHero({
  value,
  variant = "display",
  tone = "default",
  color,
  animate = true,
  accessibilityLabel,
  style,
  testID,
}: MoneyHeroProps) {
  const target = Number(value);
  const counted = useCountUp(Number.isFinite(target) ? target : 0);
  const shown = animate ? counted : target;
  const parts = splitMoney(shown);
  const size = splitMoney(target).integer.length >= 9 ? STEP_DOWN[variant] : variant;
  const small = SMALL[size];

  return (
    <Text
      variant={size}
      tone={tone}
      color={color}
      numberOfLines={1}
      accessibilityLabel={accessibilityLabel ?? spokenMoney(value)}
      style={style}
      testID={testID}
    >
      {parts.negative ? `${MINUS} ` : ""}
      <Text variant={small} tone={tone} color={color} inline>
        {"R$ "}
      </Text>
      {parts.integer}
      <Text variant={small} tone={tone} color={color} inline>
        {`,${parts.cents}`}
      </Text>
    </Text>
  );
}
