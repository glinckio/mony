import { useId, useState } from "react";
import { StyleSheet, View } from "react-native";
import Svg, { Circle, Defs, RadialGradient, Rect, Stop } from "react-native-svg";

import { useTheme } from "../../theme";

// The gradient heroes' static decoration (Início's balance, Assinatura):
// a soft light in the top-left and two thin rings off the right edge.
export function HeroDecoration() {
  const { colors } = useTheme();
  // Unique per instance: two heroes on screen must not share a gradient id.
  const id = `hero-light-${useId().replace(/:/g, "")}`;
  const [size, setSize] = useState({ width: 0, height: 0 });
  const { width, height } = size;
  return (
    <View
      pointerEvents="none"
      style={StyleSheet.absoluteFill}
      onLayout={(event) => setSize(event.nativeEvent.layout)}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      {width > 0 ? (
        <Svg width={width} height={height}>
          <Defs>
            <RadialGradient id={id} cx="12%" cy="0%" rx="70%" ry="80%">
              <Stop offset="0" stopColor={colors.onGlass} stopOpacity={0.26} />
              <Stop offset="1" stopColor={colors.onGlass} stopOpacity={0} />
            </RadialGradient>
          </Defs>
          <Rect width={width} height={height} fill={`url(#${id})`} />
          <Circle
            cx={width + 24}
            cy={height * 0.3}
            r={150}
            stroke={colors.onGlass}
            strokeOpacity={0.12}
            strokeWidth={1.5}
            fill="none"
          />
          <Circle
            cx={width + 24}
            cy={height * 0.3}
            r={96}
            stroke={colors.onGlass}
            strokeOpacity={0.14}
            strokeWidth={1.5}
            fill="none"
          />
          <Circle
            cx={width * 0.18}
            cy={height + 30}
            r={110}
            fill={colors.onGlass}
            fillOpacity={0.05}
          />
        </Svg>
      ) : null}
    </View>
  );
}
