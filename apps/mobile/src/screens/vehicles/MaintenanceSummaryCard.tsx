import type { MaintenanceAlertStatus } from "@mony/shared-types";
import { useNavigation } from "@react-navigation/native";
import { useQuery } from "@tanstack/react-query";
import { memo, useCallback } from "react";
import { StyleSheet, View } from "react-native";

import { MaintenanceAlertRow } from "../../components/domain";
import { Button, Card, ErrorState, IconBadge, Rule, Skeleton, Text } from "../../components/ui";
import { apiFetch } from "../../lib/api-client";
import { countAlerts } from "../../lib/maintenance-display";
import type { AppStackNavigation } from "../../navigation/RootNavigator";
import { space } from "../../theme";

const PREVIEW_COUNT = 3;

// The vehicle screen's maintenance section: how many items are overdue /
// urgent / need attention, the most urgent ones, and the way in to
// register a maintenance or see everything. Without any maintenance type
// yet, it explains what to track and offers to create the first one.
// Memoized: its only prop is the id, so the vehicle screen's own state
// changes (sheets, photo upload) don't re-render it.
export const MaintenanceSummaryCard = memo(function MaintenanceSummaryCard({
  vehicleId,
}: {
  vehicleId: string;
}) {
  const navigation = useNavigation<AppStackNavigation>();
  const { data, isError, refetch } = useQuery({
    queryKey: ["maintenance-alerts", vehicleId],
    queryFn: () => apiFetch<MaintenanceAlertStatus[]>(`/vehicles/${vehicleId}/maintenance-alerts`),
  });
  // Kept fresh by invalidation: record/type writes, the mileage sheet and
  // the vehicle form all invalidate this key (no refetch on focus).

  const register = useCallback(
    (alert?: MaintenanceAlertStatus) =>
      navigation.navigate("MaintenanceRecordForm", {
        vehicleId,
        maintenanceTypeId: alert?.maintenanceTypeId,
      }),
    [navigation, vehicleId],
  );

  if (isError) {
    return (
      <Card testID="maintenance-card">
        <ErrorState compact onRetry={() => void refetch()} />
      </Card>
    );
  }
  if (!data) {
    return (
      <Card testID="maintenance-card" style={styles.card}>
        <Skeleton width={140} height={18} />
        <Skeleton height={56} radius="md" />
        <Skeleton height={56} radius="md" />
      </Card>
    );
  }

  if (data.length === 0) {
    return (
      <Card testID="maintenance-card" style={styles.card}>
        <View style={styles.header}>
          <IconBadge icon="construct" size={40} filled />
          <Text variant="headline" style={styles.flex}>
            Manutenções
          </Text>
        </View>
        <Text variant="callout" tone="muted">
          Cadastre o que você quer acompanhar — troca de óleo, filtros, pneus, freios — e o Mony
          avisa quando estiver chegando a hora, pela quilometragem ou pela data.
        </Text>
        <Button
          testID="create-first-maintenance-type"
          label="Cadastrar tipo de manutenção"
          leftIcon="add"
          variant="secondary"
          onPress={() => navigation.navigate("MaintenanceTypeForm")}
        />
      </Card>
    );
  }

  const counts = countAlerts(data);
  const allGood = counts.overdue + counts.urgent + counts.warning === 0;

  return (
    <Card testID="maintenance-card" style={styles.card}>
      <View style={styles.header}>
        <IconBadge icon="construct" size={40} filled />
        <View style={styles.flex}>
          <Text variant="headline">Manutenções</Text>
          <Text variant="footnote" tone={allGood ? "success" : "muted"} testID="maintenance-counts">
            {allGood
              ? "Tudo em dia"
              : [
                  counts.overdue
                    ? `${counts.overdue} atrasada${counts.overdue > 1 ? "s" : ""}`
                    : null,
                  counts.urgent ? `${counts.urgent} urgente${counts.urgent > 1 ? "s" : ""}` : null,
                  counts.warning ? `${counts.warning} para ficar de olho` : null,
                ]
                  .filter(Boolean)
                  .join(" · ")}
          </Text>
        </View>
      </View>

      <View>
        {data.slice(0, PREVIEW_COUNT).map((alert, index) => (
          <View key={alert.maintenanceTypeId}>
            {index > 0 ? <Rule /> : null}
            <MaintenanceAlertRow
              testID={`maintenance-alert-${alert.maintenanceTypeId}`}
              alert={alert}
              index={index}
              onPress={register}
            />
          </View>
        ))}
      </View>

      <View style={styles.actions}>
        <Button
          testID="register-maintenance-button"
          label="Registrar"
          leftIcon="add"
          size="sm"
          fullWidth={false}
          style={styles.flex}
          onPress={() => register()}
        />
        <Button
          testID="see-maintenance-button"
          label={data.length > PREVIEW_COUNT ? `Ver todas (${data.length})` : "Ver manutenções"}
          variant="secondary"
          size="sm"
          fullWidth={false}
          style={styles.flex}
          onPress={() => navigation.navigate("Maintenance", { vehicleId })}
        />
      </View>
    </Card>
  );
});

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  card: {
    gap: space.md,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
  },
  actions: {
    flexDirection: "row",
    gap: space.sm,
  },
});
