import type { ReportCategory } from "@mony/shared-types";
import { StyleSheet, View } from "react-native";
import Svg, { Circle, G } from "react-native-svg";

import { formatMoney, spokenMoney } from "../../lib/money-display";
import { categoryShares, percentLabel } from "../../lib/report-display";
import { radius, space, useTheme } from "../../theme";
import { Rule } from "../ui/Rule";
import { Text } from "../ui/Text";

interface CategoryDonutProps {
  // Legacy's top 5, largest first.
  categories: ReportCategory[];
  // In the center, above the total ("Top 5").
  centerLabel: string;
  testID?: string;
}

const SIZE = 148;
const STROKE = 18;
const GAP = 2;

// Relatórios' category pie, as a donut in each category's own color, the
// top 5's total in the middle; below, the legend with each one's value
// and share (of the top 5, as legacy's pie).
export function CategoryDonut({ categories, centerLabel, testID }: CategoryDonutProps) {
  const { colors } = useTheme();
  const shares = categoryShares(categories);
  const total = categories.reduce((sum, category) => sum + Number(category.total), 0);
  const r = (SIZE - STROKE) / 2;
  const circumference = 2 * Math.PI * r;
  const gap = shares.length > 1 ? GAP : 0;
  let offset = 0;

  return (
    <View style={styles.container} testID={testID}>
      <View
        style={styles.donut}
        accessible
        accessibilityLabel={`${centerLabel}: ${spokenMoney(total)}`}
      >
        <Svg width={SIZE} height={SIZE}>
          <G rotation={-90} origin={`${SIZE / 2}, ${SIZE / 2}`}>
            <Circle
              cx={SIZE / 2}
              cy={SIZE / 2}
              r={r}
              stroke={colors.surfaceMuted}
              strokeWidth={STROKE}
              fill="none"
            />
            {shares.map((category) => {
              const length = category.share * circumference;
              const dash = Math.max(0, length - gap);
              const segment = (
                <Circle
                  key={category.categoryId}
                  cx={SIZE / 2}
                  cy={SIZE / 2}
                  r={r}
                  stroke={category.color}
                  strokeWidth={STROKE}
                  strokeDasharray={`${dash} ${circumference - dash}`}
                  strokeDashoffset={-offset}
                  fill="none"
                />
              );
              offset += length;
              return segment;
            })}
          </G>
        </Svg>
        <View style={styles.center} pointerEvents="none">
          <Text variant="caption" tone="muted">
            {centerLabel}
          </Text>
          <Text variant="numeral" numberOfLines={1} adjustsFontSizeToFit>
            {formatMoney(total)}
          </Text>
        </View>
      </View>

      <View style={styles.legend}>
        {shares.map((category, index) => (
          <View key={category.categoryId}>
            {index > 0 ? <Rule /> : null}
            <View
              style={styles.row}
              accessible
              accessibilityLabel={`${category.name}: ${spokenMoney(category.total)}, ${percentLabel(category.share)}`}
            >
              <View style={[styles.swatch, { backgroundColor: category.color }]} />
              <Text variant="body" numberOfLines={1} style={styles.flex}>
                {category.name}
              </Text>
              <Text variant="numeral">{formatMoney(category.total)}</Text>
              <Text variant="footnote" tone="muted" align="right" style={styles.share}>
                {percentLabel(category.share)}
              </Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

const SWATCH = 10;
const SHARE_WIDTH = 52;

const styles = StyleSheet.create({
  container: {
    gap: space.lg,
  },
  donut: {
    width: SIZE,
    height: SIZE,
    alignSelf: "center",
  },
  center: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: STROKE + space.sm,
  },
  legend: {
    gap: space.xs,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.sm,
    paddingVertical: space.sm,
  },
  swatch: {
    width: SWATCH,
    height: SWATCH,
    borderRadius: radius.full,
  },
  flex: {
    flex: 1,
  },
  share: {
    width: SHARE_WIDTH,
  },
});
