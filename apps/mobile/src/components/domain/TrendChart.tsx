import { useState, type ReactNode } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";
import Svg, { Circle, Defs, Line, LinearGradient, Path, Stop } from "react-native-svg";

import { radius, space, useMotion, useTheme } from "../../theme";
import { haptic } from "../../theme/haptics";
import { Text } from "../ui/Text";

export interface TrendPoint {
  key: string;
  label: string;
  values: number[];
  spoken: string;
}

export interface TrendSeries {
  name: string;
  color: string;
  // A soft fill under the line (the first series only reads well).
  fill?: boolean;
}

interface TrendChartProps {
  points: TrendPoint[];
  series: TrendSeries[];
  renderDetail: (point: TrendPoint) => ReactNode;
  height?: number;
  testID?: string;
}

const STROKE = 2.5;
const DOT = 4;

// Relatórios' "Evolução anual": one line per series over the months, a
// soft fill under the first, no axis. Tapping a month drops a guide with
// its dots and reads its figures above, like the column charts. The lines
// fade in once (static when motion is reduced).
export function TrendChart({
  points,
  series,
  renderDetail,
  height = 120,
  testID,
}: TrendChartProps) {
  const { colors } = useTheme();
  const { reduced } = useMotion();
  const [width, setWidth] = useState(0);
  const [selectedKey, setSelectedKey] = useState(points.at(-1)?.key);
  const selectedIndex = Math.max(
    0,
    points.findIndex((point) => point.key === selectedKey),
  );
  const max = Math.max(1, ...points.flatMap((point) => point.values));
  // Half a column of inset on each side, so the dots line up with the labels.
  const step = points.length > 0 ? width / points.length : 0;
  const x = (index: number) => step * index + step / 2;
  const y = (value: number) => DOT + (height - 2 * DOT) * (1 - value / max);
  const path = (seriesIndex: number) =>
    points
      .map(
        (point, index) =>
          `${index === 0 ? "M" : "L"}${x(index)},${y(point.values[seriesIndex] ?? 0)}`,
      )
      .join(" ");
  const selected = points[selectedIndex];

  return (
    <View style={styles.container} testID={testID}>
      <View style={styles.detail} accessibilityLiveRegion="polite">
        {selected ? renderDetail(selected) : null}
      </View>

      <View style={{ height }} onLayout={(event) => setWidth(event.nativeEvent.layout.width)}>
        {width > 0 && points.length > 1 ? (
          <Animated.View
            entering={reduced ? undefined : FadeIn.duration(360)}
            style={StyleSheet.absoluteFill}
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
          >
            <Svg width={width} height={height}>
              <Defs>
                {series.map((item, index) =>
                  item.fill ? (
                    <LinearGradient
                      key={item.name}
                      id={`trend-fill-${index}`}
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <Stop offset="0" stopColor={item.color} stopOpacity={0.18} />
                      <Stop offset="1" stopColor={item.color} stopOpacity={0} />
                    </LinearGradient>
                  ) : null,
                )}
              </Defs>
              <Line
                x1={x(selectedIndex)}
                x2={x(selectedIndex)}
                y1={0}
                y2={height}
                stroke={colors.primaryMuted}
                strokeWidth={step * 0.7}
                strokeLinecap="round"
              />
              {series.map((item, index) =>
                item.fill ? (
                  <Path
                    key={`fill-${item.name}`}
                    d={`${path(index)} L${x(points.length - 1)},${height} L${x(0)},${height} Z`}
                    fill={`url(#trend-fill-${index})`}
                  />
                ) : null,
              )}
              {series.map((item, index) => (
                <Path
                  key={item.name}
                  d={path(index)}
                  stroke={item.color}
                  strokeWidth={STROKE}
                  strokeLinejoin="round"
                  strokeLinecap="round"
                  fill="none"
                />
              ))}
              {selected
                ? series.map((item, index) => (
                    <Circle
                      key={`dot-${item.name}`}
                      cx={x(selectedIndex)}
                      cy={y(selected.values[index] ?? 0)}
                      r={DOT}
                      fill={colors.surface}
                      stroke={item.color}
                      strokeWidth={STROKE}
                    />
                  ))
                : null}
            </Svg>
          </Animated.View>
        ) : null}
        <View style={styles.hits}>
          {points.map((point) => (
            <Pressable
              key={point.key}
              style={styles.flex}
              onPress={() => {
                haptic.selection();
                setSelectedKey(point.key);
              }}
              accessibilityRole="button"
              accessibilityState={{ selected: point.key === selected?.key }}
              accessibilityLabel={point.spoken}
            />
          ))}
        </View>
      </View>

      <View style={styles.labels} accessibilityElementsHidden importantForAccessibility="no">
        {points.map((point) => (
          <Text
            key={point.key}
            variant="caption"
            align="center"
            color={point.key === selected?.key ? colors.primary : colors.textSubtle}
            style={styles.flex}
          >
            {point.label}
          </Text>
        ))}
      </View>

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
    </View>
  );
}

const SWATCH = 8;

const styles = StyleSheet.create({
  container: {
    gap: space.sm,
  },
  detail: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
    minHeight: 20,
    marginBottom: space.sm,
  },
  hits: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    flexDirection: "row",
  },
  flex: {
    flex: 1,
  },
  labels: {
    flexDirection: "row",
  },
  legend: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
    marginTop: space.sm,
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
