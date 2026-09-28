import { useEffect, useRef } from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";

import { motionTokens, radius, space, useMotion, useTheme, type Theme } from "../../theme";
import { haptic } from "../../theme/haptics";
import { Icon, type IconName } from "../ui/Icon";
import { Text } from "../ui/Text";
import { Touchable } from "../ui/Touchable";

export type StatusKind =
  | "paid" // lançamento pago
  | "toPay" // lançamento a pagar
  | "installmentPaid" // parcela paga
  | "installmentOverdue" // parcela vencida
  | "installmentPending" // parcela a pagar
  | "debtActive"
  | "debtOverdue"
  | "debtPaidOff"
  | "goalLate"
  | "goalReached"
  | "missing" // item de mercado faltando
  | "maintenanceOverdue"
  | "maintenanceUrgent"
  | "maintenanceWarning"
  | "maintenanceOnTrack"
  | "done";

type Tone = "success" | "warning" | "danger" | "brand";

const KINDS: Record<StatusKind, { label: string; tone: Tone; icon: IconName }> = {
  paid: { label: "Pago", tone: "success", icon: "checkmark-circle" },
  toPay: { label: "A pagar", tone: "warning", icon: "time" },
  installmentPaid: { label: "Paga", tone: "success", icon: "checkmark-circle" },
  installmentOverdue: { label: "Vencida", tone: "danger", icon: "alert-circle" },
  installmentPending: { label: "A pagar", tone: "warning", icon: "time" },
  debtActive: { label: "Ativa", tone: "brand", icon: "ellipse" },
  debtOverdue: { label: "Atrasada", tone: "danger", icon: "alert-circle" },
  debtPaidOff: { label: "Quitada", tone: "success", icon: "checkmark-circle" },
  goalLate: { label: "Atrasada", tone: "danger", icon: "alert-circle" },
  goalReached: { label: "Alcançada", tone: "success", icon: "trophy" },
  missing: { label: "Faltando", tone: "warning", icon: "cart" },
  maintenanceOverdue: { label: "Atrasada", tone: "danger", icon: "alert-circle" },
  maintenanceUrgent: { label: "Urgente", tone: "danger", icon: "hourglass" },
  maintenanceWarning: { label: "Atenção", tone: "warning", icon: "time" },
  maintenanceOnTrack: { label: "Em dia", tone: "success", icon: "checkmark-circle" },
  done: { label: "Pronto", tone: "success", icon: "checkmark-circle" },
};

function toneColors(tone: Tone, colors: Theme["colors"]) {
  switch (tone) {
    case "success":
      return { fg: colors.onSuccessMuted, bg: colors.successMuted, icon: colors.success };
    case "warning":
      return { fg: colors.onWarningMuted, bg: colors.warningMuted, icon: colors.warning };
    case "danger":
      return { fg: colors.onDangerMuted, bg: colors.dangerMuted, icon: colors.danger };
    default:
      return { fg: colors.onPrimaryMuted, bg: colors.primaryMuted, icon: colors.primary };
  }
}

interface StatusPillProps {
  kind: StatusKind;
  // Tappable pills (toggle paid ↔ to pay, undo a payment).
  onPress?: () => void;
  accessibilityLabel?: string;
  disabled?: boolean;
  testID?: string;
}

// Status as a small pastel pill with its icon. When the status changes it
// gives a short pop (scale) and a haptic; reduced motion just fades.
export function StatusPill({
  kind,
  onPress,
  accessibilityLabel,
  disabled = false,
  testID,
}: StatusPillProps) {
  const { colors } = useTheme();
  const { reduced } = useMotion();
  const { label, tone, icon } = KINDS[kind];
  const palette = toneColors(tone, colors);
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);
  const previous = useRef(kind);

  useEffect(() => {
    if (previous.current === kind) return;
    previous.current = kind;
    if (reduced) {
      opacity.value = 0;
      opacity.value = withTiming(1, { duration: motionTokens.duration.fast });
      return;
    }
    scale.value = withSequence(
      withTiming(1.18, { duration: 90 }),
      withSpring(1, motionTokens.springStamp),
    );
    haptic.stamp();
  }, [kind, opacity, reduced, scale]);

  const pop = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  const pill = (
    <Animated.View style={[styles.pill, { backgroundColor: palette.bg }, pop]}>
      <Icon name={icon} size={14} color={palette.icon} />
      <Text variant="caption" color={palette.fg} numberOfLines={1}>
        {label}
      </Text>
    </Animated.View>
  );

  if (!onPress) {
    return (
      <View testID={testID} accessible accessibilityLabel={accessibilityLabel ?? label}>
        {pill}
      </View>
    );
  }
  return (
    <Touchable
      testID={testID}
      feedback="sink"
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      hitSlop={{ top: 10, bottom: 10, left: 6, right: 6 }}
    >
      {pill}
    </Touchable>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: space.xs,
    paddingHorizontal: space.sm + 2,
    paddingVertical: 3,
    borderRadius: radius.full,
  },
});
