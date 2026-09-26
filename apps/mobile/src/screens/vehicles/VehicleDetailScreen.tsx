import type { Vehicle } from "@mony/shared-types";
import { useNavigation, useRoute, type RouteProp } from "@react-navigation/native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { StyleSheet, View, useWindowDimensions } from "react-native";

import { MercosulPlate, Odometer, VehicleHero } from "../../components/domain";
import {
  Button,
  Card,
  ConfirmSheet,
  ErrorState,
  IconBadge,
  IconButton,
  ScrollScreen,
  Skeleton,
  Text,
} from "../../components/ui";
import { ApiError, apiFetch } from "../../lib/api-client";
import { formatDateDisplay } from "../../lib/date-mask";
import { useToastStore } from "../../lib/toast-store";
import { FUEL_TYPE_LABELS } from "../../lib/vehicle-display";
import { pickVehiclePhoto, uploadVehiclePhoto, type PickedPhoto } from "../../lib/vehicle-photo";
import type { AppStackNavigation, AppStackParamList } from "../../navigation/RootNavigator";
import { space } from "../../theme";

import { UpdateMileageSheet } from "./UpdateMileageSheet";

const HERO_OVERLAP = 32;

// Veículo (design/telas.md §15): the photo bleeding to the top edge (or a
// gradient with the car when there's none), the name and plate on a card
// riding over it, the odometer, and the vehicle's details.
export function VehicleDetailScreen() {
  const navigation = useNavigation<AppStackNavigation>();
  const route = useRoute<RouteProp<AppStackParamList, "VehicleDetail">>();
  const { vehicleId } = route.params;
  const queryClient = useQueryClient();
  const { width } = useWindowDimensions();
  const [mileageSheetOpen, setMileageSheetOpen] = useState(false);
  const [confirm, setConfirm] = useState<"delete" | "removePhoto" | null>(null);

  const {
    data: vehicle,
    isError,
    refetch,
  } = useQuery({
    queryKey: ["vehicle", vehicleId],
    queryFn: () => apiFetch<Vehicle>(`/vehicles/${vehicleId}`),
    // Render straight away from the list's copy while the detail loads.
    placeholderData: () =>
      queryClient.getQueryData<Vehicle[]>(["vehicles"])?.find((item) => item.id === vehicleId),
  });

  const applyVehicle = (updated: Vehicle) => {
    queryClient.setQueryData(["vehicle", vehicleId], updated);
    void queryClient.invalidateQueries({ queryKey: ["vehicles"] });
  };

  // pt-BR copy per known status; never the API's own message.
  const photoErrorMessage = (error: unknown, fallback: string) => {
    if (error instanceof ApiError && error.statusCode === 413) {
      return "A foto é muito grande (máx. 5 MB).";
    }
    if (error instanceof ApiError && error.statusCode === 409) {
      // Changed from another device meanwhile — show what's there now.
      void queryClient.invalidateQueries({ queryKey: ["vehicle", vehicleId] });
      return "A foto foi alterada em outro lugar. Confira e tente de novo.";
    }
    return fallback;
  };

  // Only the upload is the mutation — the picker opens before it, so the
  // button doesn't spin while the gallery is open and a picker problem
  // isn't reported as an upload failure.
  const photoMutation = useMutation({
    mutationFn: (photo: PickedPhoto) => uploadVehiclePhoto(vehicleId, photo),
    onSuccess: applyVehicle,
    onError: (error) => {
      if (__DEV__) console.warn("Vehicle photo upload failed:", error);
      useToastStore
        .getState()
        .show(photoErrorMessage(error, "Não foi possível enviar a foto. Tente novamente."));
    },
  });

  const changePhoto = async () => {
    let photo: PickedPhoto | null;
    try {
      photo = await pickVehiclePhoto();
    } catch (error) {
      if (__DEV__) console.warn("Vehicle photo pick failed:", error);
      useToastStore.getState().show("Não foi possível abrir suas fotos.");
      return;
    }
    if (photo) photoMutation.mutate(photo);
  };

  const removePhotoMutation = useMutation({
    mutationFn: () => apiFetch<Vehicle>(`/vehicles/${vehicleId}/photo`, { method: "DELETE" }),
    onSuccess: (updated) => {
      setConfirm(null);
      applyVehicle(updated);
    },
    onError: (error) => {
      setConfirm(null);
      useToastStore
        .getState()
        .show(photoErrorMessage(error, "Não foi possível remover a foto. Tente novamente."));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => apiFetch(`/vehicles/${vehicleId}`, { method: "DELETE" }),
    onSuccess: async () => {
      setConfirm(null);
      queryClient.removeQueries({ queryKey: ["vehicle", vehicleId] });
      await queryClient.invalidateQueries({ queryKey: ["vehicles"] });
      navigation.goBack();
    },
    onError: () => {
      setConfirm(null);
      useToastStore.getState().show("Não foi possível excluir. Tente novamente.");
    },
  });

  const photoBusy = photoMutation.isPending || removePhotoMutation.isPending;

  return (
    <ScrollScreen
      title={vehicle?.displayName ?? "Veículo"}
      onBack={() => navigation.goBack()}
      hero={
        <VehicleHero
          testID="vehicle-photo"
          photoUrl={isError ? null : (vehicle?.photoUrl ?? null)}
          name={vehicle?.displayName}
          height={Math.min(360, width * 0.78) + HERO_OVERLAP}
        />
      }
      heroOverlap={HERO_OVERLAP}
      actions={
        vehicle && !isError ? (
          <>
            <IconButton
              testID="edit-vehicle-button"
              icon="pencil"
              variant="soft"
              accessibilityLabel="Editar veículo"
              onPress={() => navigation.navigate("VehicleForm", { vehicle })}
            />
            <IconButton
              testID="delete-vehicle-button"
              icon="trash-outline"
              variant="soft"
              tone="danger"
              accessibilityLabel="Excluir veículo"
              disabled={deleteMutation.isPending}
              onPress={() => setConfirm("delete")}
            />
          </>
        ) : null
      }
    >
      {isError ? (
        <Card>
          <ErrorState compact onRetry={() => void refetch()} />
        </Card>
      ) : !vehicle ? (
        <View style={styles.stack} accessibilityLabel="Carregando o veículo">
          <Skeleton height={120} radius="lg" />
          <Skeleton height={120} radius="lg" />
        </View>
      ) : (
        <View style={styles.stack}>
          <Card style={styles.identity}>
            <Text variant="title2" numberOfLines={2}>
              {vehicle.displayName}
            </Text>
            {vehicle.licensePlate ? <MercosulPlate plate={vehicle.licensePlate} /> : null}
            <View style={styles.photoActions}>
              <Button
                testID="change-photo-button"
                label={vehicle.photoUrl ? "Trocar foto" : "Adicionar foto"}
                leftIcon="image-outline"
                variant="secondary"
                size="sm"
                fullWidth={false}
                loading={photoMutation.isPending}
                disabled={photoBusy}
                onPress={() => void changePhoto()}
              />
              {vehicle.photoUrl ? (
                <Button
                  testID="remove-photo-button"
                  label="Remover foto"
                  variant="dangerGhost"
                  size="sm"
                  fullWidth={false}
                  loading={removePhotoMutation.isPending}
                  disabled={photoBusy}
                  onPress={() => setConfirm("removePhoto")}
                />
              ) : null}
            </View>
          </Card>

          <Card style={styles.mileage}>
            <View style={styles.mileageHeader}>
              <IconBadge icon="speedometer" size={40} filled />
              <Text variant="headline" style={styles.flex}>
                Quilometragem
              </Text>
              <Button
                testID="update-mileage-button"
                label="Atualizar"
                size="sm"
                fullWidth={false}
                onPress={() => setMileageSheetOpen(true)}
              />
            </View>
            <Odometer testID="vehicle-mileage" km={vehicle.currentMileage} />
          </Card>

          <Card testID="vehicle-details" style={styles.details}>
            <Text variant="headline">Ficha</Text>
            <Detail label="Placa" value={vehicle.licensePlate} />
            <Detail label="Ano" value={`${vehicle.manufactureYear}/${vehicle.modelYear}`} />
            <Detail label="Cor" value={vehicle.color} />
            <Detail
              label="Combustível"
              value={vehicle.fuelType ? FUEL_TYPE_LABELS[vehicle.fuelType] : null}
            />
            <Detail
              label="Aquisição"
              value={vehicle.acquisitionDate ? formatDateDisplay(vehicle.acquisitionDate) : null}
            />
          </Card>

          {/* Filled in by the vehicle-maintenance feature (roadmap #12). */}
          <Card style={styles.maintenance}>
            <IconBadge icon="construct-outline" size={40} />
            <View style={styles.flex}>
              <Text variant="headline">Manutenções</Text>
              <Text variant="footnote" tone="muted">
                Em breve: histórico e alertas de manutenção.
              </Text>
            </View>
          </Card>

          <UpdateMileageSheet
            vehicle={vehicle}
            visible={mileageSheetOpen}
            onClose={() => setMileageSheetOpen(false)}
          />
        </View>
      )}

      <ConfirmSheet
        visible={confirm === "delete"}
        title={vehicle ? `Excluir "${vehicle.displayName}"?` : ""}
        message="A foto e os dados dele saem do Mony."
        confirmLabel="Excluir veículo"
        busy={deleteMutation.isPending}
        onConfirm={() => deleteMutation.mutate()}
        onClose={() => setConfirm(null)}
      />
      <ConfirmSheet
        visible={confirm === "removePhoto"}
        title="Remover a foto deste veículo?"
        message="Você pode escolher outra depois."
        confirmLabel="Remover foto"
        busy={removePhotoMutation.isPending}
        onConfirm={() => removePhotoMutation.mutate()}
        onClose={() => setConfirm(null)}
      />
    </ScrollScreen>
  );
}

function Detail({ label, value }: { label: string; value: string | null }) {
  return (
    <View style={styles.detailRow}>
      <Text variant="callout" tone="muted">
        {label}
      </Text>
      <Text variant="bodyStrong" style={styles.detailValue} numberOfLines={1}>
        {value ?? "—"}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  stack: {
    gap: space.lg,
  },
  identity: {
    gap: space.md,
  },
  photoActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: space.sm,
  },
  mileage: {
    gap: space.lg,
  },
  mileageHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
  },
  details: {
    gap: space.md,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: space.md,
  },
  detailValue: {
    flexShrink: 1,
    textAlign: "right",
  },
  maintenance: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
  },
});
