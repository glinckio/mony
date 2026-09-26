import type { Vehicle } from "@mony/shared-types";
import { useNavigation } from "@react-navigation/native";
import { useQuery } from "@tanstack/react-query";
import { StyleSheet, View } from "react-native";

import { VehiclePhoto } from "../../components/domain";
import {
  EmptyState,
  ErrorState,
  Icon,
  IconButton,
  ScrollScreen,
  Skeleton,
  Text,
  Touchable,
} from "../../components/ui";
import { apiFetch } from "../../lib/api-client";
import { useRefetchOnFocus } from "../../lib/use-refetch-on-focus";
import { FUEL_TYPE_LABELS, formatMileage } from "../../lib/vehicle-display";
import type { AppStackNavigation } from "../../navigation/RootNavigator";
import { radius, space, useTheme } from "../../theme";

// Veículos (design/telas.md §14): the garage — each vehicle as a card with
// its photo, name, plate and mileage.
export function VehiclesListScreen() {
  const navigation = useNavigation<AppStackNavigation>();
  const { colors, elevation } = useTheme();
  const {
    data: vehicles,
    isError,
    isRefetching,
    refetch,
  } = useQuery({
    queryKey: ["vehicles"],
    queryFn: () => apiFetch<Vehicle[]>("/vehicles"),
  });
  // Signed photo URLs expire after an hour — refetching on focus keeps
  // them fresh when coming back to the list.
  useRefetchOnFocus(refetch);

  return (
    <ScrollScreen
      title="Veículos"
      onBack={() => navigation.goBack()}
      actions={
        <IconButton
          testID="add-vehicle-button"
          icon="add"
          variant="soft"
          tone="primary"
          accessibilityLabel="Novo veículo"
          onPress={() => navigation.navigate("VehicleForm", undefined)}
        />
      }
      refreshing={isRefetching}
      onRefresh={() => void refetch()}
    >
      {isError ? (
        <ErrorState onRetry={() => void refetch()} />
      ) : !vehicles ? (
        <View style={styles.list} accessibilityLabel="Carregando veículos">
          {[0, 1, 2].map((index) => (
            <Skeleton key={index} height={98} radius="lg" />
          ))}
        </View>
      ) : vehicles.length === 0 ? (
        <EmptyState
          image="emptyVehicles"
          icon="car-sport-outline"
          title="Nenhum veículo ainda."
          message="Cadastre o carro ou a moto e acompanhe a quilometragem."
          action={{
            label: "Cadastrar veículo",
            onPress: () => navigation.navigate("VehicleForm", undefined),
          }}
        />
      ) : (
        <View style={styles.list} testID="vehicles-list">
          {vehicles.map((vehicle) => (
            <Touchable
              key={vehicle.id}
              testID={`vehicle-row-${vehicle.id}`}
              feedback="sink"
              accessibilityRole="button"
              accessibilityLabel={vehicle.displayName}
              onPress={() => navigation.navigate("VehicleDetail", { vehicleId: vehicle.id })}
              style={[styles.card, { backgroundColor: colors.surface }, elevation("sm")]}
            >
              <VehiclePhoto
                uri={vehicle.photoUrl}
                size="thumb"
                accessibilityLabel={`Foto de ${vehicle.displayName}`}
              />
              <View style={styles.text}>
                <Text variant="bodyStrong" numberOfLines={1}>
                  {vehicle.displayName}
                </Text>
                <Text variant="footnote" tone="muted" numberOfLines={1}>
                  {[vehicle.licensePlate, formatMileage(vehicle.currentMileage)]
                    .filter(Boolean)
                    .join(" · ")}
                </Text>
                {vehicle.fuelType ? (
                  <View style={[styles.fuel, { backgroundColor: colors.primaryMuted }]}>
                    <Icon name="water-outline" size={12} color={colors.primary} />
                    <Text variant="caption" tone="primary" numberOfLines={1}>
                      {FUEL_TYPE_LABELS[vehicle.fuelType]}
                    </Text>
                  </View>
                ) : null}
              </View>
              <Icon name="chevron-forward" size="md" color={colors.textSubtle} />
            </Touchable>
          ))}
        </View>
      )}
    </ScrollScreen>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: space.md,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
    padding: space.md,
    borderRadius: radius.lg,
  },
  text: {
    flex: 1,
    gap: space.xxs,
  },
  fuel: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: space.xs,
    paddingHorizontal: space.sm,
    paddingVertical: 2,
    borderRadius: radius.full,
    marginTop: space.xxs,
  },
});
