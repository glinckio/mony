import { StyleSheet, View } from "react-native";

import { formatDateDisplay } from "../../lib/date-mask";
import { formatMoney, spokenMoney } from "../../lib/money-display";
import { space, useTheme } from "../../theme";
import { IconBadge, ProgressBar } from "../ui/Surfaces";
import { Text } from "../ui/Text";

import { StatusPill } from "./StatusPill";

interface GoalProgressProps {
  title: string;
  currentAmount: string;
  targetAmount: string;
  targetDate?: string | null;
  completed?: boolean;
  overdue?: boolean;
  // Goal's category color for the badge (falls back to the brand).
  color?: string;
  // Stagger when several bars enter together.
  index?: number;
  testID?: string;
  progressTestID?: string;
  overdueTestID?: string;
}

// A savings goal as a row: badge, title, "R$ x / R$ y", gradient bar and
// the percentage — the reference's budget-category row.
export function GoalProgress({
  title,
  currentAmount,
  targetAmount,
  targetDate,
  completed = false,
  overdue = false,
  color,
  index = 0,
  testID,
  progressTestID,
  overdueTestID,
}: GoalProgressProps) {
  const { colors } = useTheme();
  const target = Number(targetAmount) || 0;
  const current = Number(currentAmount) || 0;
  const percent = target > 0 ? Math.max(0, Math.min(100, (current / target) * 100)) : 0;
  const rounded = Math.round(percent);

  return (
    <View style={styles.row} testID={testID}>
      <IconBadge
        icon={completed ? "trophy" : "flag"}
        color={completed ? colors.success : (color ?? colors.primary)}
        size={44}
        filled
      />
      <View style={styles.body}>
        <View style={styles.line}>
          <Text variant="bodyStrong" numberOfLines={1} style={styles.flex}>
            {title}
          </Text>
          <Text variant="subhead" tone={completed ? "success" : "default"}>
            {completed ? "100%" : `${rounded}%`}
          </Text>
        </View>
        <ProgressBar
          percent={completed ? 100 : percent}
          tone={completed ? "success" : "brand"}
          index={index}
          testID={progressTestID}
          accessibilityLabel={`${title}: ${spokenMoney(current)} de ${spokenMoney(target)}, ${rounded}%`}
        />
        <View style={styles.line}>
          <Text variant="footnote" tone="muted" style={styles.flex} numberOfLines={1}>
            {formatMoney(current)} / {formatMoney(target)}
            {targetDate ? ` · até ${formatDateDisplay(targetDate)}` : ""}
          </Text>
          {completed ? (
            <StatusPill kind="goalReached" />
          ) : overdue ? (
            <StatusPill kind="goalLate" testID={overdueTestID} />
          ) : null}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: space.md,
  },
  body: {
    flex: 1,
    gap: space.sm,
  },
  line: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.sm,
  },
  flex: {
    flex: 1,
  },
});
