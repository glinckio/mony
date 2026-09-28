import type { MaintenanceAlertStatus } from "@mony/shared-types";
import { memo } from "react";
import { StyleSheet, View } from "react-native";

import {
  MAINTENANCE_STATUS_KIND,
  MAINTENANCE_STATUS_LABELS,
  MAINTENANCE_STATUS_TONE,
  distanceCopy,
  systemLabel,
  timeCopy,
} from "../../lib/maintenance-display";
import { space } from "../../theme";
import { ProgressBar } from "../ui/Surfaces";
import { Text } from "../ui/Text";
import { Touchable } from "../ui/Touchable";

import { StatusPill } from "./StatusPill";

interface MaintenanceAlertRowProps {
  alert: MaintenanceAlertStatus;
  // Registers this maintenance (the form opens with the type chosen).
  onPress?: (alert: MaintenanceAlertStatus) => void;
  // Stagger for the bar's entrance when several rows appear together.
  index?: number;
  testID?: string;
}

// One maintenance type's status on a vehicle: name and status pill, a
// thin bar of how close it is to due (tone by status), and how far away
// it is in km and, if it has a time interval, in days.
export const MaintenanceAlertRow = memo(function MaintenanceAlertRow({
  alert,
  onPress,
  index = 0,
  testID,
}: MaintenanceAlertRowProps) {
  const distance = distanceCopy(alert);
  const time = timeCopy(alert);
  const detail = time ? `${distance} · ${time}` : distance;

  return (
    <Touchable
      testID={testID}
      feedback={onPress ? "row" : "none"}
      disabled={!onPress}
      accessibilityRole={onPress ? "button" : undefined}
      accessibilityLabel={`${alert.name}, ${MAINTENANCE_STATUS_LABELS[alert.status]}, ${detail}`}
      accessibilityHint={onPress ? "Registrar esta manutenção" : undefined}
      onPress={onPress ? () => onPress(alert) : undefined}
      style={styles.row}
    >
      <View style={styles.header}>
        <View style={styles.title}>
          <Text variant="bodyStrong" numberOfLines={1}>
            {alert.name}
          </Text>
          <Text variant="caption" tone="subtle" numberOfLines={1}>
            {systemLabel(alert.system)}
          </Text>
        </View>
        <StatusPill kind={MAINTENANCE_STATUS_KIND[alert.status]} />
      </View>
      <ProgressBar
        percent={alert.percent}
        tone={MAINTENANCE_STATUS_TONE[alert.status]}
        height={6}
        index={index}
      />
      <Text variant="footnote" tone="muted" numberOfLines={1}>
        {detail}
      </Text>
    </Touchable>
  );
});

const styles = StyleSheet.create({
  row: {
    gap: space.sm,
    paddingVertical: space.md,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
  },
  title: {
    flex: 1,
    gap: space.xxs,
  },
});
