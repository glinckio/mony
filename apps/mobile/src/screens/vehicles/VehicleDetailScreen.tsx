import { Ionicons } from "@expo/vector-icons";
import type { Vehicle } from "@mony/shared-types";
import { color, radius, size as sizeTokens, spacing } from "@mony/ui-tokens";
import { useNavigation, useRoute, type RouteProp } from "@react-navigation/native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { ActivityIndicator, Alert, StyleSheet, TouchableOpacity, View } from "react-native";

import { AppHeader, Button, PhotoFrame, Screen, Text } from "../../components/ui";
import { ApiError, apiFetch } from "../../lib/api-client";
import { formatDateDisplay } from "../../lib/date-mask";
import { useToastStore } from "../../lib/toast-store";
import { FUEL_TYPE_LABELS, formatMileage } from "../../lib/vehicle-display";
import { pickVehiclePhoto, uploadVehiclePhoto, type PickedPhoto } from "../../lib/vehicle-photo";
import type { AppStackNavigation, AppStackParamList } from "../../navigation/RootNavigator";

import { UpdateMileageSheet } from "./UpdateMileageSheet";

export function VehicleDetailScreen() {
  const navigation = useNavigation<AppStackNavigation>();
  const route = useRoute<RouteProp<AppStackParamList, "VehicleDetail">>();
  const { vehicleId } = route.params;
  const queryClient = useQueryClient();
  const [mileageSheetOpen, setMileageSheetOpen] = useState(false);

  const { data: vehicle, isError } = useQuery({
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
    onSuccess: applyVehicle,
    onError: (error) =>
      useToastStore
        .getState()
        .show(photoErrorMessage(error, "Não foi possível remover a foto. Tente novamente.")),
  });

  const deleteMutation = useMutation({
    mutationFn: () => apiFetch(`/vehicles/${vehicleId}`, { method: "DELETE" }),
    onSuccess: async () => {
      queryClient.removeQueries({ queryKey: ["vehicle", vehicleId] });
      await queryClient.invalidateQueries({ queryKey: ["vehicles"] });
      navigation.goBack();
    },
    onError: () => Alert.alert("Erro", "Não foi possível excluir. Tente novamente."),
  });

  const confirmDelete = () => {
    if (!vehicle) return;
    Alert.alert("Excluir veículo", `Excluir "${vehicle.displayName}"?`, [
      { text: "Cancelar", style: "cancel" },
      { text: "Excluir", style: "destructive", onPress: () => deleteMutation.mutate() },
    ]);
  };

  const confirmRemovePhoto = () => {
    Alert.alert("Remover foto", "Remover a foto deste veículo?", [
      { text: "Cancelar", style: "cancel" },
      { text: "Remover", style: "destructive", onPress: () => removePhotoMutation.mutate() },
    ]);
  };

  const photoBusy = photoMutation.isPending || removePhotoMutation.isPending;

  return (
    <Screen>
      <AppHeader
        title={vehicle?.displayName ?? "Veículo"}
        onBack={() => navigation.goBack()}
        rightAccessory={
          vehicle && (
            <View style={styles.headerActions}>
              <TouchableOpacity
                testID="edit-vehicle-button"
                accessibilityRole="button"
                accessibilityLabel="Editar veículo"
                hitSlop={8}
                onPress={() => navigation.navigate("VehicleForm", { vehicle })}
              >
                <Ionicons name="pencil-outline" size={sizeTokens.iconLg} color={color.primary} />
              </TouchableOpacity>
              <TouchableOpacity
                testID="delete-vehicle-button"
                accessibilityRole="button"
                accessibilityLabel="Excluir veículo"
                hitSlop={8}
                disabled={deleteMutation.isPending}
                onPress={confirmDelete}
              >
                <Ionicons name="trash-outline" size={sizeTokens.iconLg} color={color.danger} />
              </TouchableOpacity>
            </View>
          )
        }
      />

      {isError ? (
        <Text variant="caption" color={color.danger}>
          Algo deu errado. Tente novamente.
        </Text>
      ) : !vehicle ? (
        <View style={styles.centered}>
          <ActivityIndicator color={color.primary} />
        </View>
      ) : (
        <View style={styles.content}>
          <PhotoFrame
            testID="vehicle-photo"
            uri={vehicle.photoUrl}
            placeholderIcon="car-sport-outline"
            accessibilityLabel={`Foto de ${vehicle.displayName}`}
          />
          <View style={styles.photoActions}>
            <Button
              testID="change-photo-button"
              label={vehicle.photoUrl ? "Trocar foto" : "Adicionar foto"}
              variant="secondary"
              fullWidth={false}
              loading={photoMutation.isPending}
              disabled={photoBusy}
              onPress={changePhoto}
            />
            {vehicle.photoUrl && (
              <Button
                testID="remove-photo-button"
                label="Remover foto"
                variant="ghost"
                fullWidth={false}
                loading={removePhotoMutation.isPending}
                disabled={photoBusy}
                onPress={confirmRemovePhoto}
              />
            )}
          </View>

          <View style={styles.card}>
            <View style={styles.mileageRow}>
              <View>
                <Text variant="caption">Quilometragem</Text>
                <Text variant="title" testID="vehicle-mileage">
                  {formatMileage(vehicle.currentMileage)}
                </Text>
              </View>
              <Button
                testID="update-mileage-button"
                label="Atualizar"
                variant="secondary"
                fullWidth={false}
                onPress={() => setMileageSheetOpen(true)}
              />
            </View>
          </View>

          <View style={styles.card} testID="vehicle-details">
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
          </View>

          {/* Filled in by the vehicle-maintenance feature (roadmap #12). */}
          <View style={styles.card}>
            <Text variant="bodyStrong">Manutenções</Text>
            <Text variant="caption">Em breve: histórico e alertas de manutenção.</Text>
          </View>

          <UpdateMileageSheet
            vehicle={vehicle}
            visible={mileageSheetOpen}
            onClose={() => setMileageSheetOpen(false)}
          />
        </View>
      )}
    </Screen>
  );
}

function Detail({ label, value }: { label: string; value: string | null }) {
  return (
    <View style={styles.detailRow}>
      <Text variant="caption">{label}</Text>
      <Text variant="body">{value ?? "—"}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  content: {
    gap: spacing.md,
  },
  photoActions: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  card: {
    gap: spacing.sm,
    padding: spacing.md,
    backgroundColor: color.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: color.border,
  },
  mileageRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: spacing.md,
  },
});
