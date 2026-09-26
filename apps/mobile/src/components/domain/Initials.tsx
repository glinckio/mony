import { LinearGradient } from "expo-linear-gradient";
import { StyleSheet, View } from "react-native";

import { radius, useTheme } from "../../theme";
import { Text } from "../ui/Text";
import { Touchable } from "../ui/Touchable";

export function initialsOf(name: string | null | undefined): string {
  const parts = (name ?? "").trim().split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? "") : "";
  return (first + last).toUpperCase() || "M";
}

interface InitialsProps {
  name: string | null | undefined;
  size?: number;
  // "glass": translucent circle with a white border, on the gradient hero.
  variant?: "gradient" | "glass";
  onPress?: () => void;
  accessibilityLabel?: string;
  testID?: string;
}

// The person's initials in a brand-gradient circle — the account's mark on the
// Início header and on Mais/Perfil (there are no profile photos).
export function Initials({
  name,
  size = 40,
  variant = "gradient",
  onPress,
  accessibilityLabel,
  testID,
}: InitialsProps) {
  const { colors, gradients, elevation } = useTheme();
  const glass = variant === "glass";
  const circle = (
    <View
      style={[
        styles.circle,
        { width: size, height: size },
        glass
          ? { backgroundColor: colors.glassFill, borderColor: colors.glassBorder, borderWidth: 1 }
          : elevation("sm"),
      ]}
    >
      {glass ? null : (
        <LinearGradient
          colors={gradients.brand}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[StyleSheet.absoluteFill, styles.fill]}
        />
      )}
      <Text variant={size >= 64 ? "title2" : "subhead"} color={colors.onPrimary}>
        {initialsOf(name)}
      </Text>
    </View>
  );
  if (!onPress) return circle;
  return (
    <Touchable
      testID={testID}
      feedback="sink"
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? "Abrir perfil"}
      hitSlop={(48 - size) / 2 > 0 ? (48 - size) / 2 : 0}
    >
      {circle}
    </Touchable>
  );
}

const styles = StyleSheet.create({
  fill: {
    borderRadius: radius.full,
  },
  circle: {
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
  },
});
