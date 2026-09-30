import { useState, type ReactNode } from "react";
import { Pressable, StyleSheet, View } from "react-native";

import { radius, space, useTheme } from "../../theme";
import { haptic } from "../../theme/haptics";
import { Text } from "../ui/Text";

import { ChartBar } from "./ChartBar";

export interface ChartColumn {
  key: string;
  label: string;
  // One value per series.
  values: number[];
  // Under the label (e.g. the month's balance).
  caption?: ReactNode;
  // Read aloud for the whole column.
  spoken: string;
}

export interface ChartSeries {
  name: string;
  gradient: readonly [string, string];
  color: string;
}

interface ColumnChartProps {
  columns: ChartColumn[];
  series: ChartSeries[];
  // Selected at first (defaults to the last column).
  initialKey?: string;
  // The selected column's figures, above the plot.
  renderDetail: (column: ChartColumn) => ReactNode;
  height?: number;
  barWidth?: number;
  testID?: string;
}

// Relatórios' column charts, in Início's year-chart language: rounded
// gradient bars growing from the base, no axis; the selected column sits
// on a soft indigo band and its figures read above. One series (expenses
// by weekday) or two side by side (income × expenses per month).
export function ColumnChart({
  columns,
  series,
  initialKey,
  renderDetail,
  height = 110,
  barWidth = 7,
  testID,
}: ColumnChartProps) {
  const { colors } = useTheme();
  const [selectedKey, setSelectedKey] = useState(initialKey ?? columns.at(-1)?.key);
  const max = Math.max(1, ...columns.flatMap((column) => column.values));
  const selected = columns.find((column) => column.key === selectedKey) ?? columns.at(-1);

  return (
    <View style={styles.container} testID={testID}>
      <View style={styles.detail} accessibilityLiveRegion="polite">
        {selected ? renderDetail(selected) : null}
      </View>

      {/* Only the plot has a fixed height; the labels under it take what
          they need, so large system fonts don't get clipped. */}
      <View style={styles.chart}>
        {columns.map((column, index) => {
          const isSelected = column.key === selected?.key;
          return (
            <Pressable
              key={column.key}
              style={styles.column}
              onPress={() => {
                haptic.selection();
                setSelectedKey(column.key);
              }}
              accessibilityRole="button"
              accessibilityState={{ selected: isSelected }}
              accessibilityLabel={column.spoken}
            >
              {isSelected ? (
                <View style={[styles.band, { backgroundColor: colors.primaryMuted }]} />
              ) : null}
              <View style={[styles.bars, { height }]}>
                {column.values.map((value, seriesIndex) => (
                  <ChartBar
                    key={series[seriesIndex]?.name ?? seriesIndex}
                    value={value}
                    max={max}
                    height={height}
                    width={barWidth}
                    gradient={series[seriesIndex]!.gradient}
                    index={index}
                  />
                ))}
              </View>
              <View style={styles.label}>
                <Text variant="caption" color={isSelected ? colors.primary : colors.textSubtle}>
                  {column.label}
                </Text>
                {column.caption}
              </View>
            </Pressable>
          );
        })}
      </View>

      {series.length > 1 ? (
        <View style={styles.legend} accessibilityElementsHidden importantForAccessibility="no">
          {series.map((item) => (
            <View key={item.name} style={styles.legendItem}>
              <View style={[styles.swatch, { backgroundColor: item.color }]} />
              <Text variant="caption" tone="muted">
                {item.name}
              </Text>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const SWATCH = 8;
const COLUMN_MAX_WIDTH = 96;

const styles = StyleSheet.create({
  container: {
    gap: space.lg,
  },
  detail: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
    minHeight: 20,
  },
  chart: {
    flexDirection: "row",
    alignItems: "stretch",
    // With few columns (a range of one or two months) they stay column-
    // sized in the middle instead of stretching across the card.
    justifyContent: "center",
  },
  column: {
    flex: 1,
    maxWidth: COLUMN_MAX_WIDTH,
    alignItems: "center",
    justifyContent: "flex-end",
    gap: space.sm,
    paddingTop: space.sm,
    paddingBottom: space.xxs,
  },
  band: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: space.xxs,
    right: space.xxs,
    borderRadius: radius.sm,
  },
  bars: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: space.xs,
  },
  label: {
    alignItems: "center",
    gap: space.xxs,
  },
  legend: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.xs,
  },
  swatch: {
    width: SWATCH,
    height: SWATCH,
    borderRadius: radius.full,
  },
});
