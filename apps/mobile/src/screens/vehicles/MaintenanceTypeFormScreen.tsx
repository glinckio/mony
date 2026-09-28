import { zodResolver } from "@hookform/resolvers/zod";
import {
  MAINTENANCE_SYSTEMS,
  createMaintenanceTypeInputSchema,
  type CreateMaintenanceTypeInput,
} from "@mony/shared-types";
import { useNavigation } from "@react-navigation/native";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { StyleSheet, View } from "react-native";

import {
  Button,
  Card,
  Field,
  FormScreen,
  InlineNotice,
  SelectChip,
  TextField,
} from "../../components/ui";
import { apiFetch } from "../../lib/api-client";
import { MAINTENANCE_SYSTEM_LABELS } from "../../lib/maintenance-display";
import { parseIntegerInput } from "../../lib/vehicle-display";
import type { AppStackNavigation } from "../../navigation/RootNavigator";
import { space } from "../../theme";
import { haptic } from "../../theme/haptics";

const numberText = (value: number | undefined) => (value === undefined ? "" : String(value));

// Tipo de manutenção (form) (design/telas.md → Manutenção): what to track,
// how often in km and, optionally, in months (whichever comes first), and
// the vehicle system it belongs to. Created types start being tracked on
// every vehicle right away.
export function MaintenanceTypeFormScreen() {
  const navigation = useNavigation<AppStackNavigation>();
  const queryClient = useQueryClient();
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<CreateMaintenanceTypeInput>({
    resolver: zodResolver(createMaintenanceTypeInputSchema),
    defaultValues: { name: "", description: "" },
  });
  const system = watch("system");

  const onSubmit = async (data: CreateMaintenanceTypeInput) => {
    setSubmitError(null);
    try {
      await apiFetch("/maintenance-types", {
        method: "POST",
        body: JSON.stringify({ ...data, description: data.description || undefined }),
      });
    } catch {
      haptic.error();
      setSubmitError("Algo deu errado. Tente novamente.");
      return;
    }
    // The new type gets an alert on every vehicle.
    void queryClient.invalidateQueries({ queryKey: ["maintenance-types"] });
    void queryClient.invalidateQueries({ queryKey: ["maintenance-alerts"] });
    haptic.success();
    navigation.goBack();
  };

  return (
    <FormScreen
      title="Novo tipo de manutenção"
      onClose={() => navigation.goBack()}
      footer={
        <>
          {submitError ? <InlineNotice tone="danger" message={submitError} /> : null}
          <Button
            testID="submit-button"
            label="Criar tipo"
            onPress={handleSubmit(onSubmit)}
            loading={isSubmitting}
          />
        </>
      }
    >
      <Card style={styles.card}>
        <Controller
          control={control}
          name="name"
          render={({ field }) => (
            <TextField
              testID="name-input"
              label="Nome"
              value={field.value}
              onChangeText={field.onChange}
              placeholder="Ex.: Troca de óleo e filtro"
              autoCapitalize="sentences"
              error={errors.name?.message}
            />
          )}
        />
        <View style={styles.row}>
          <Controller
            control={control}
            name="kmInterval"
            render={({ field }) => (
              <TextField
                testID="km-interval-input"
                label="A cada (km)"
                value={numberText(field.value)}
                onChangeText={(text) => field.onChange(parseIntegerInput(text))}
                keyboardType="number-pad"
                placeholder="10000"
                containerStyle={styles.flex}
                error={errors.kmInterval?.message}
              />
            )}
          />
          <Controller
            control={control}
            name="monthsInterval"
            render={({ field }) => (
              <TextField
                testID="months-interval-input"
                label="Ou a cada (meses)"
                value={numberText(field.value)}
                onChangeText={(text) => field.onChange(parseIntegerInput(text.slice(0, 3)))}
                keyboardType="number-pad"
                placeholder="Opcional"
                containerStyle={styles.flex}
                error={errors.monthsInterval?.message}
              />
            )}
          />
        </View>
        <InlineNotice
          tone="neutral"
          message="Vale o que vencer primeiro: a quilometragem ou o tempo desde a última vez."
        />
      </Card>

      <Field label="Sistema do veículo (opcional)">
        <View style={styles.chips} testID="system-options">
          {MAINTENANCE_SYSTEMS.map((option) => (
            <SelectChip
              key={option}
              testID={`system-option-${option}`}
              label={MAINTENANCE_SYSTEM_LABELS[option]}
              selected={system === option}
              // Tapping the chosen one again clears it (it's optional).
              onPress={() =>
                setValue("system", system === option ? undefined : option, { shouldValidate: true })
              }
            />
          ))}
        </View>
      </Field>

      <Controller
        control={control}
        name="description"
        render={({ field }) => (
          <TextField
            testID="description-input"
            label="Descrição (opcional)"
            value={field.value ?? ""}
            onChangeText={field.onChange}
            placeholder="Ex.: óleo 5W30 sintético"
            multiline
            maxLength={255}
            error={errors.description?.message}
          />
        )}
      />
    </FormScreen>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  card: {
    gap: space.lg,
  },
  row: {
    flexDirection: "row",
    gap: space.md,
  },
  chips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: space.sm,
  },
});
