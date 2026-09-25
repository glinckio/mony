import { Ionicons } from "@expo/vector-icons";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  FUEL_TYPES,
  createVehicleInputSchema,
  type CreateVehicleInput,
  type UpdateVehicleInput,
  type Vehicle,
} from "@mony/shared-types";
import { color, radius, size as sizeTokens, spacing } from "@mony/ui-tokens";
import { useNavigation, useRoute, type RouteProp } from "@react-navigation/native";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { StyleSheet, TouchableOpacity, View } from "react-native";

import { Button, PhotoFrame, Screen, Text, TextField } from "../../components/ui";
import { ApiError, apiFetch } from "../../lib/api-client";
import { formatDateDisplay, formatDateInputDigits, parseDateInputToISO } from "../../lib/date-mask";
import { useToastStore } from "../../lib/toast-store";
import { FUEL_TYPE_LABELS, formatMileage, parseIntegerInput } from "../../lib/vehicle-display";
import { pickVehiclePhoto, uploadVehiclePhoto, type PickedPhoto } from "../../lib/vehicle-photo";
import type { AppStackNavigation, AppStackParamList } from "../../navigation/RootNavigator";

const numberText = (value: number | undefined) => (value === undefined ? "" : String(value));

export function VehicleFormScreen() {
  const navigation = useNavigation<AppStackNavigation>();
  const queryClient = useQueryClient();
  const route = useRoute<RouteProp<AppStackParamList, "VehicleForm">>();
  const editing = route.params?.vehicle;
  const [submitError, setSubmitError] = useState<string | null>(null);
  // Photo is only picked here when creating; an existing vehicle's photo
  // is managed from its detail screen.
  const [photo, setPhoto] = useState<PickedPhoto | null>(null);
  const [dateDisplay, setDateDisplay] = useState(
    editing?.acquisitionDate ? formatDateDisplay(editing.acquisitionDate) : "",
  );

  const {
    control,
    handleSubmit,
    watch,
    setValue,
    setError,
    formState: { errors, isSubmitting, dirtyFields },
  } = useForm<CreateVehicleInput>({
    resolver: zodResolver(createVehicleInputSchema),
    defaultValues: {
      make: editing?.make ?? "",
      model: editing?.model ?? "",
      manufactureYear: editing?.manufactureYear,
      modelYear: editing?.modelYear,
      currentMileage: editing?.currentMileage,
      licensePlate: editing?.licensePlate ?? "",
      acquisitionDate: editing?.acquisitionDate ?? undefined,
      color: editing?.color ?? "",
      fuelType: editing?.fuelType ?? undefined,
    },
  });

  const fuelType = watch("fuelType");

  const mileageFloorError = (current: number) =>
    `A quilometragem não pode ser menor que a atual (${formatMileage(current)})`;

  // Seed the detail cache with what the API returned and refresh the list
  // in the background (not awaited — the list refetches on focus anyway).
  const applySaved = (saved: Vehicle) => {
    queryClient.setQueryData(["vehicle", saved.id], saved);
    void queryClient.invalidateQueries({ queryKey: ["vehicles"] });
  };

  const onSubmit = async (data: CreateVehicleInput) => {
    setSubmitError(null);

    if (editing) {
      // Legacy rule, checked here first so the error sits on the field.
      if (data.currentMileage < editing.currentMileage) {
        setError("currentMileage", { message: mileageFloorError(editing.currentMileage) });
        return;
      }
      // Only what the user actually changed — re-sending an untouched
      // mileage would make, say, a color-only edit fail if another device
      // raised the mileage meanwhile.
      const normalized: UpdateVehicleInput = {
        ...data,
        licensePlate: data.licensePlate || null,
        acquisitionDate: data.acquisitionDate || null,
        color: data.color || null,
        fuelType: data.fuelType ?? null,
      };
      const body = Object.fromEntries(
        Object.entries(normalized).filter(
          ([field]) => dirtyFields[field as keyof CreateVehicleInput],
        ),
      ) as UpdateVehicleInput;
      if (Object.keys(body).length === 0) {
        navigation.goBack();
        return;
      }
      let saved: Vehicle;
      try {
        saved = await apiFetch<Vehicle>(`/vehicles/${editing.id}`, {
          method: "PATCH",
          body: JSON.stringify(body),
        });
      } catch (error) {
        if (error instanceof ApiError && error.statusCode === 400) {
          // The one 400 the form can't pre-empt: the mileage was raised
          // elsewhere meanwhile — show the stored value, per design.md.
          const latest = await apiFetch<Vehicle>(`/vehicles/${editing.id}`).catch(() => null);
          if (latest && data.currentMileage < latest.currentMileage) {
            setError("currentMileage", { message: mileageFloorError(latest.currentMileage) });
            return;
          }
        }
        setSubmitError("Algo deu errado. Tente novamente.");
        return;
      }
      applySaved(saved);
      navigation.goBack();
      return;
    }

    let created: Vehicle;
    try {
      created = await apiFetch<Vehicle>("/vehicles", {
        method: "POST",
        body: JSON.stringify({
          ...data,
          licensePlate: data.licensePlate || undefined,
          color: data.color || undefined,
        }),
      });
    } catch {
      setSubmitError("Algo deu errado. Tente novamente.");
      return;
    }
    // Separate request, never blocking the save (design.md): the vehicle
    // exists either way; a failed upload can be retried from its screen.
    let saved = created;
    if (photo) {
      try {
        saved = await uploadVehiclePhoto(created.id, photo);
      } catch (error) {
        // Dev-only: the toast is deliberately generic, so surface the real
        // cause (status + API message, or a network failure) in Metro.
        if (__DEV__) console.warn("Vehicle photo upload failed:", error);
        useToastStore
          .getState()
          .show(
            "Veículo salvo, mas não foi possível enviar a foto. Tente de novo na tela do veículo.",
          );
      }
    }
    applySaved(saved);
    navigation.goBack();
  };

  const choosePhoto = async () => {
    try {
      const picked = await pickVehiclePhoto();
      if (picked) setPhoto(picked);
    } catch (error) {
      if (__DEV__) console.warn("Vehicle photo pick failed:", error);
      useToastStore.getState().show("Não foi possível abrir suas fotos.");
    }
  };

  return (
    <Screen>
      <View style={styles.header}>
        <Text variant="heading">{editing ? "Editar veículo" : "Novo veículo"}</Text>
        <TouchableOpacity
          testID="header-close"
          accessibilityRole="button"
          accessibilityLabel="Fechar"
          hitSlop={8}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="close-outline" size={sizeTokens.iconLg} color={color.textPrimary} />
        </TouchableOpacity>
      </View>

      <View style={styles.form}>
        {!editing && (
          <View style={styles.photo}>
            <PhotoFrame
              testID="vehicle-photo-preview"
              uri={photo?.uri ?? null}
              placeholderIcon="camera-outline"
            />
            <Button
              testID="pick-photo-button"
              label={photo ? "Trocar foto" : "Adicionar foto (opcional)"}
              variant="secondary"
              onPress={choosePhoto}
            />
          </View>
        )}

        <Controller
          control={control}
          name="make"
          render={({ field }) => (
            <TextField
              testID="make-input"
              label="Marca"
              value={field.value}
              onChangeText={field.onChange}
              placeholder="Ex.: Jeep"
              error={errors.make?.message}
            />
          )}
        />
        <Controller
          control={control}
          name="model"
          render={({ field }) => (
            <TextField
              testID="model-input"
              label="Modelo"
              value={field.value}
              onChangeText={field.onChange}
              placeholder="Ex.: Renegade"
              error={errors.model?.message}
            />
          )}
        />

        <View style={styles.row}>
          <View style={styles.rowField}>
            <Controller
              control={control}
              name="manufactureYear"
              render={({ field }) => (
                <TextField
                  testID="manufacture-year-input"
                  label="Ano de fabricação"
                  value={numberText(field.value)}
                  onChangeText={(text) => field.onChange(parseIntegerInput(text.slice(0, 4)))}
                  keyboardType="number-pad"
                  placeholder="2021"
                  maxLength={4}
                  error={errors.manufactureYear?.message}
                />
              )}
            />
          </View>
          <View style={styles.rowField}>
            <Controller
              control={control}
              name="modelYear"
              render={({ field }) => (
                <TextField
                  testID="model-year-input"
                  label="Ano do modelo"
                  value={numberText(field.value)}
                  onChangeText={(text) => field.onChange(parseIntegerInput(text.slice(0, 4)))}
                  keyboardType="number-pad"
                  placeholder="2022"
                  maxLength={4}
                  error={errors.modelYear?.message}
                />
              )}
            />
          </View>
        </View>

        <Controller
          control={control}
          name="currentMileage"
          render={({ field }) => (
            <TextField
              testID="current-mileage-input"
              label="Quilometragem atual (km)"
              value={numberText(field.value)}
              onChangeText={(text) => field.onChange(parseIntegerInput(text))}
              keyboardType="number-pad"
              placeholder="0"
              error={errors.currentMileage?.message}
            />
          )}
        />

        <Controller
          control={control}
          name="licensePlate"
          render={({ field }) => (
            <TextField
              testID="license-plate-input"
              label="Placa (opcional)"
              value={field.value ?? ""}
              onChangeText={(text) => field.onChange(text.toUpperCase())}
              autoCapitalize="characters"
              maxLength={10}
              placeholder="ABC1D23"
              error={errors.licensePlate?.message}
            />
          )}
        />

        <Controller
          control={control}
          name="acquisitionDate"
          render={({ field }) => (
            <TextField
              testID="acquisition-date-input"
              label="Data de aquisição (opcional)"
              value={dateDisplay}
              onChangeText={(text) => {
                setDateDisplay(formatDateInputDigits(text));
                // Empty clears it; a half-typed date is kept as-is so the
                // schema flags it ("Data inválida") instead of silently
                // dropping — and, on edit, clearing — the stored date.
                field.onChange(text ? parseDateInputToISO(text) || text : undefined);
              }}
              keyboardType="number-pad"
              placeholder="DD/MM/AAAA"
              error={errors.acquisitionDate?.message}
            />
          )}
        />

        <Controller
          control={control}
          name="color"
          render={({ field }) => (
            <TextField
              testID="color-input"
              label="Cor (opcional)"
              value={field.value ?? ""}
              onChangeText={field.onChange}
              placeholder="Ex.: Prata"
              error={errors.color?.message}
            />
          )}
        />

        <View>
          <Text variant="caption" style={styles.fieldLabel}>
            Combustível (opcional)
          </Text>
          <View style={styles.chipList} testID="fuel-type-picker">
            {FUEL_TYPES.map((option) => {
              const selected = option === fuelType;
              return (
                <TouchableOpacity
                  key={option}
                  testID={`fuel-type-${option}`}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  style={[styles.chip, selected && styles.chipSelected]}
                  // Tapping the selected chip clears it (the field is optional).
                  onPress={() =>
                    setValue("fuelType", selected ? undefined : option, { shouldDirty: true })
                  }
                >
                  <Text variant="caption" color={selected ? color.onPrimary : color.textPrimary}>
                    {FUEL_TYPE_LABELS[option]}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </View>

      {submitError && (
        <View style={styles.submitError}>
          <Ionicons name="alert-circle-outline" size={sizeTokens.iconSm} color={color.danger} />
          <Text variant="caption" color={color.danger}>
            {submitError}
          </Text>
        </View>
      )}

      <Button
        testID="submit-button"
        label={editing ? "Salvar alterações" : "Cadastrar veículo"}
        onPress={handleSubmit(onSubmit)}
        loading={isSubmitting}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  form: {
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  photo: {
    gap: spacing.sm,
  },
  row: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  rowField: {
    flex: 1,
  },
  fieldLabel: {
    marginBottom: spacing.xs,
    marginLeft: spacing.xxs,
  },
  chipList: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  chip: {
    backgroundColor: color.surfaceAlt,
    borderRadius: radius.sm,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  chipSelected: {
    backgroundColor: color.primary,
  },
  submitError: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    backgroundColor: color.dangerMuted,
    borderRadius: radius.sm,
    padding: spacing.sm,
    marginBottom: spacing.md,
  },
});
