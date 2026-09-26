import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";

import { useTheme } from "../../theme";

interface RuleProps {
  // pauta: hairline separator (`border`)
  // sum: a stronger rule under a section title (`text`, 1.5)
  kind?: "pauta" | "sum";
  inset?: number;
  style?: StyleProp<ViewStyle>;
}

export function Rule({ kind = "pauta", inset = 0, style }: RuleProps) {
  const { colors } = useTheme();
  return (
    <View
      style={[
        kind === "sum" ? styles.sum : styles.pauta,
        { backgroundColor: kind === "sum" ? colors.text : colors.border, marginHorizontal: inset },
        style,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  pauta: {
    height: StyleSheet.hairlineWidth * 2,
  },
  sum: {
    height: 1.5,
  },
});
