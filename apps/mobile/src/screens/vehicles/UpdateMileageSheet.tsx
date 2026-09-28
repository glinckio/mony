import { zodResolver } from "@hookform/resolvers/zod";
import {
  updateMileageInputSchema,
  type UpdateMileageInput,
  type Vehicle,
} from "@mony/shared-types";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { StyleSheet, View } from "react-native";

import { Odometer } from "../../components/domain";
import { Button, InlineNotice, PaperSheet, Text, TextField } from "../../components/ui";
import { ApiError, apiFetch } from "../../lib/api-client";
import { formatMileage, parseIntegerInput } from "../../lib/vehicle-display";
import { space } from "../../theme";

interface UpdateMileageSheetProps {
  vehicle: Vehicle;
  visible: boolean;
  onClose: () => void;
}

// Quick mileage update from the detail screen. The form refuses a lower
// value against what the screen loaded; if the API still says "lower"
// (someone raised it meanwhile), the refreshed vehicle's value is shown.
export function UpdateMileageSheet({ vehicle, visible, onClose }: UpdateMileageSheetProps) {
  const queryClient = useQueryClient();
  const schema = useMemo(
    () => updateMileageInputSchema(vehicle.currentMileage),
    [vehicle.currentMileage],
  );
  const {
    control,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<UpdateMileageInput>({
    resolver: zodResolver(schema),
    defaultValues: { currentMileage: vehicle.currentMileage },
  });

  // Set for any failure that isn't the "mileage went down" conflict.
  const [genericError, setGenericError] = useState(false);

  const mutation = useMutation({
    mutationFn: (input: UpdateMileageInput) =>
      apiFetch<Vehicle>(`/vehicles/${vehicle.id}`, {
        method: "PATCH",
        body: JSON.stringify(input),
      }),
    onSuccess: (updated) => {
      queryClient.setQueryData(["vehicle", vehicle.id], updated);
      void queryClient.invalidateQueries({ queryKey: ["vehicles"] });
      // Maintenance status depends on the mileage.
      void queryClient.invalidateQueries({ queryKey: ["maintenance-alerts", vehicle.id] });
      onClose();
    },
    onError: async (error, input) => {
      if (error instanceof ApiError && error.statusCode === 400) {
        const latest = await apiFetch<Vehicle>(`/vehicles/${vehicle.id}`).catch(() => null);
        // Only a real "lower than stored" gets the field error; any other
        // 400 falls through to the generic message.
        if (latest && input.currentMileage < latest.currentMileage) {
          queryClient.setQueryData(["vehicle", vehicle.id], latest);
          setError("currentMileage", {
            message: `A quilometragem não pode ser menor que a atual (${formatMileage(
              latest.currentMileage,
            )})`,
          });
          return;
        }
      }
      setGenericError(true);
    },
  });

  // Re-seed only when the sheet OPENS — not when the stored mileage
  // changes while it's open (the conflict path above refreshes it), or the
  // reset would wipe the error and the value the user just typed.
  const wasVisible = useRef(false);
  useEffect(() => {
    if (visible && !wasVisible.current) {
      setGenericError(false);
      reset({ currentMileage: vehicle.currentMileage });
    }
    wasVisible.current = visible;
  }, [visible, vehicle.currentMileage, reset]);

  return (
    <PaperSheet
      testID="update-mileage-sheet"
      visible={visible}
      title="Atualizar quilometragem"
      onClose={onClose}
    >
      <View style={styles.current}>
        <Odometer km={vehicle.currentMileage} />
        <Text variant="footnote" tone="muted">
          Atual: {formatMileage(vehicle.currentMileage)}
        </Text>
      </View>
      <Controller
        control={control}
        name="currentMileage"
        render={({ field }) => (
          <TextField
            testID="mileage-input"
            label="Nova quilometragem (km)"
            value={field.value !== undefined ? String(field.value) : ""}
            onChangeText={(text) => field.onChange(parseIntegerInput(text))}
            keyboardType="number-pad"
            leftIcon="speedometer-outline"
            error={errors.currentMileage?.message}
          />
        )}
      />
      {genericError ? (
        <InlineNotice tone="danger" message="Algo deu errado. Tente novamente." />
      ) : null}
      <Button
        testID="save-mileage-button"
        label="Salvar"
        loading={mutation.isPending}
        onPress={handleSubmit((input) => {
          setGenericError(false);
          mutation.mutate(input);
        })}
      />
    </PaperSheet>
  );
}

const styles = StyleSheet.create({
  current: {
    gap: space.sm,
  },
});
