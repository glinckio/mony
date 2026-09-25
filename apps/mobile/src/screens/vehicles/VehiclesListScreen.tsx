import { Ionicons } from "@expo/vector-icons";
import type { Vehicle } from "@mony/shared-types";
import { color, radius, size as sizeTokens, spacing } from "@mony/ui-tokens";
import { useNavigation } from "@react-navigation/native";
import { useQuery } from "@tanstack/react-query";
import { ActivityIndicator, FlatList, StyleSheet, TouchableOpacity, View } from "react-native";

import { AppHeader, PhotoFrame, Screen, Text } from "../../components/ui";
import { apiFetch } from "../../lib/api-client";
import { useRefetchOnFocus } from "../../lib/use-refetch-on-focus";
import { formatMileage } from "../../lib/vehicle-display";
import type { AppStackNavigation } from "../../navigation/RootNavigator";

export function VehiclesListScreen() {
  const navigation = useNavigation<AppStackNavigation>();
  const {
    data: vehicles,
    isError,
    refetch,
  } = useQuery({
    queryKey: ["vehicles"],
    queryFn: () => apiFetch<Vehicle[]>("/vehicles"),
  });
  // Signed photo URLs expire after an hour — refetching on focus keeps
  // them fresh when coming back to the list.
  useRefetchOnFocus(refetch);

  return (
    <Screen scrollable={false}>
      <AppHeader
        title="Veículos"
        onBack={() => navigation.goBack()}
        rightAccessory={
          <TouchableOpacity
            testID="add-vehicle-button"
            accessibilityRole="button"
            accessibilityLabel="Novo veículo"
            hitSlop={8}
            onPress={() => navigation.navigate("VehicleForm", undefined)}
          >
            <Ionicons name="add-circle-outline" size={sizeTokens.iconLg} color={color.primary} />
          </TouchableOpacity>
        }
      />

      {isError ? (
        <Text variant="caption" color={color.danger}>
          Algo deu errado. Tente novamente.
        </Text>
      ) : !vehicles ? (
        <View style={styles.centered}>
          <ActivityIndicator color={color.primary} />
        </View>
      ) : (
        <FlatList
          testID="vehicles-list"
          data={vehicles}
          keyExtractor={(vehicle) => vehicle.id}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <Text variant="caption" color={color.textSecondary}>
              Nenhum veículo ainda.
            </Text>
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              testID={`vehicle-row-${item.id}`}
              accessibilityRole="button"
              accessibilityLabel={item.displayName}
              style={styles.row}
              onPress={() => navigation.navigate("VehicleDetail", { vehicleId: item.id })}
            >
              <PhotoFrame
                uri={item.photoUrl}
                placeholderIcon="car-sport-outline"
                variant="thumb"
                accessibilityLabel={`Foto de ${item.displayName}`}
              />
              <View style={styles.rowText}>
                <Text variant="bodyStrong" numberOfLines={1}>
                  {item.displayName}
                </Text>
                <Text variant="caption">
                  {[item.licensePlate, formatMileage(item.currentMileage)]
                    .filter(Boolean)
                    .join(" · ")}
                </Text>
              </View>
              <Ionicons
                name="chevron-forward"
                size={sizeTokens.iconMd}
                color={color.textSecondary}
              />
            </TouchableOpacity>
          )}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  listContent: {
    gap: spacing.sm,
    paddingBottom: spacing.lg,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.md,
    backgroundColor: color.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: color.border,
  },
  rowText: {
    flex: 1,
    gap: spacing.xxs,
  },
});
