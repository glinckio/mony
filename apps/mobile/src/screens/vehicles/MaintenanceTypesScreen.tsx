import type { MaintenanceType } from "@mony/shared-types";
import { useNavigation } from "@react-navigation/native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { StyleSheet, View } from "react-native";

import {
  Card,
  ConfirmSheet,
  EmptyState,
  ErrorState,
  IconButton,
  Rule,
  ScrollScreen,
  Skeleton,
  Text,
} from "../../components/ui";
import { ApiError, apiFetch } from "../../lib/api-client";
import { groupBySystem, intervalCopy } from "../../lib/maintenance-display";
import type { AppStackNavigation } from "../../navigation/RootNavigator";
import { space } from "../../theme";

// Tipos de manutenção (design/telas.md → Manutenção): what the user tracks
// on every vehicle, grouped by vehicle system, with how often; deleting
// one is refused while it has history.
export function MaintenanceTypesScreen() {
  const navigation = useNavigation<AppStackNavigation>();
  const queryClient = useQueryClient();
  const [pendingDelete, setPendingDelete] = useState<MaintenanceType | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const { data, isError, refetch } = useQuery({
    queryKey: ["maintenance-types"],
    queryFn: () => apiFetch<MaintenanceType[]>("/maintenance-types"),
    // Only in-app writes change it, and they invalidate it.
    staleTime: 5 * 60 * 1000,
  });

  const deleteMutation = useMutation({
    mutationFn: (type: MaintenanceType) =>
      apiFetch(`/maintenance-types/${type.id}`, { method: "DELETE" }),
    onSuccess: () => {
      setPendingDelete(null);
      void queryClient.invalidateQueries({ queryKey: ["maintenance-types"] });
      void queryClient.invalidateQueries({ queryKey: ["maintenance-alerts"] });
    },
    onError: (error) => {
      // pt-BR copy per known status; never the API's own message.
      setDeleteError(
        error instanceof ApiError && error.statusCode === 409
          ? "Esse tipo tem manutenções registradas. Exclua esses registros antes."
          : "Não foi possível excluir. Tente novamente.",
      );
    },
  });

  const closeDelete = () => {
    setPendingDelete(null);
    setDeleteError(null);
  };

  return (
    <ScrollScreen
      title="Tipos de manutenção"
      onBack={() => navigation.goBack()}
      actions={
        <IconButton
          testID="add-maintenance-type-button"
          icon="add"
          variant="soft"
          tone="primary"
          accessibilityLabel="Novo tipo de manutenção"
          onPress={() => navigation.navigate("MaintenanceTypeForm")}
        />
      }
    >
      {isError ? (
        <ErrorState onRetry={() => void refetch()} />
      ) : !data ? (
        <View style={styles.sections} accessibilityLabel="Carregando os tipos">
          <Skeleton height={180} radius="lg" />
          <Skeleton height={120} radius="lg" />
        </View>
      ) : data.length === 0 ? (
        <EmptyState
          icon="construct-outline"
          title="Nenhum tipo de manutenção ainda."
          message="Cadastre o que você quer acompanhar — troca de óleo, filtros, pneus, freios — e o Mony avisa quando estiver chegando a hora."
          action={{
            label: "Novo tipo",
            onPress: () => navigation.navigate("MaintenanceTypeForm"),
            testID: "empty-add-maintenance-type",
          }}
        />
      ) : (
        <View style={styles.sections}>
          {groupBySystem(data).map((group) => (
            <View key={group.title} style={styles.section}>
              <Text variant="title3" accessibilityRole="header">
                {group.title}
              </Text>
              <Card padded={false}>
                {group.items.map((type, index) => (
                  <View key={type.id}>
                    {index > 0 ? <Rule inset={space.lg} /> : null}
                    <View testID={`maintenance-type-row-${type.id}`} style={styles.row}>
                      <View style={styles.flex}>
                        <Text variant="bodyStrong" numberOfLines={2}>
                          {type.name}
                        </Text>
                        <Text variant="footnote" tone="muted">
                          {intervalCopy(type)}
                        </Text>
                        {type.description ? (
                          <Text variant="footnote" tone="subtle" numberOfLines={2}>
                            {type.description}
                          </Text>
                        ) : null}
                      </View>
                      <IconButton
                        testID={`delete-maintenance-type-${type.id}`}
                        icon="trash-outline"
                        tone="danger"
                        accessibilityLabel={`Excluir ${type.name}`}
                        onPress={() => {
                          setDeleteError(null);
                          setPendingDelete(type);
                        }}
                      />
                    </View>
                  </View>
                ))}
              </Card>
            </View>
          ))}
        </View>
      )}

      <ConfirmSheet
        visible={pendingDelete !== null}
        title={pendingDelete ? `Excluir "${pendingDelete.name}"?` : ""}
        message="Ele deixa de ser acompanhado em todos os seus veículos."
        confirmLabel="Excluir tipo"
        busy={deleteMutation.isPending}
        error={deleteError}
        onConfirm={() => {
          if (pendingDelete) deleteMutation.mutate(pendingDelete);
        }}
        onClose={closeDelete}
      />
    </ScrollScreen>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    gap: space.xxs,
  },
  sections: {
    gap: space["2xl"],
  },
  section: {
    gap: space.md,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.sm,
    paddingLeft: space.lg,
    paddingRight: space.xs,
    paddingVertical: space.md,
  },
});
