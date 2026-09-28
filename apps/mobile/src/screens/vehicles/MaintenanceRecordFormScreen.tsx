import { zodResolver } from "@hookform/resolvers/zod";
import {
  createMaintenanceRecordInputSchema,
  type CreateMaintenanceRecordInput,
  type MaintenanceRecord,
  type MaintenanceType,
  type Vehicle,
} from "@mony/shared-types";
import { useNavigation, useRoute, type RouteProp } from "@react-navigation/native";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { Image, StyleSheet, View } from "react-native";

import { AmountField } from "../../components/domain";
import {
  Button,
  Card,
  Field,
  FormScreen,
  Icon,
  IconButton,
  InlineNotice,
  SelectChip,
  Skeleton,
  Text,
  TextField,
} from "../../components/ui";
import { ApiError, apiFetch } from "../../lib/api-client";
import {
  formatDateDisplay,
  formatDateInputDigits,
  localTodayISO,
  parseDateInputToISO,
} from "../../lib/date-mask";
import { groupBySystem, maintenanceQueryKeys } from "../../lib/maintenance-display";
import {
  CameraPermissionError,
  ReceiptTooLargeError,
  pickReceiptPdf,
  pickReceiptPhoto,
  discardPickedReceipt,
  uploadReceipt,
  type PickedReceipt,
} from "../../lib/maintenance-receipt";
import { useToastStore } from "../../lib/toast-store";
import { formatMileage, parseIntegerInput } from "../../lib/vehicle-display";
import type { AppStackNavigation, AppStackParamList } from "../../navigation/RootNavigator";
import { radius, space, useTheme } from "../../theme";
import { haptic } from "../../theme/haptics";

const numberText = (value: number | undefined) => (value === undefined ? "" : String(value));

// Registrar manutenção (design/telas.md → Manutenção): which maintenance
// (grouped by vehicle system), the odometer (prefilled with the vehicle's)
// and date (today), what it cost, where, notes, and the receipt — a photo
// or a PDF, uploaded right after the record is saved.
export function MaintenanceRecordFormScreen() {
  const navigation = useNavigation<AppStackNavigation>();
  const queryClient = useQueryClient();
  const route = useRoute<RouteProp<AppStackParamList, "MaintenanceRecordForm">>();
  const { vehicleId, maintenanceTypeId } = route.params;
  const { colors } = useTheme();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<PickedReceipt | null>(null);
  const [receiptError, setReceiptError] = useState<string | null>(null);
  const [dateDisplay, setDateDisplay] = useState(formatDateDisplay(localTodayISO()));

  const vehicle = useQuery({
    queryKey: ["vehicle", vehicleId],
    queryFn: () => apiFetch<Vehicle>(`/vehicles/${vehicleId}`),
  }).data;
  const typesQuery = useQuery({
    queryKey: ["maintenance-types"],
    queryFn: () => apiFetch<MaintenanceType[]>("/maintenance-types"),
    // Only in-app writes change it, and they invalidate it.
    staleTime: 5 * 60 * 1000,
  });

  const {
    control,
    handleSubmit,
    watch,
    setValue,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<CreateMaintenanceRecordInput>({
    resolver: zodResolver(createMaintenanceRecordInputSchema),
    defaultValues: {
      maintenanceTypeId: maintenanceTypeId ?? "",
      mileage: vehicle?.currentMileage,
      date: localTodayISO(),
      location: "",
      notes: "",
    },
  });
  // Prefill the odometer once the vehicle is known (usually it's already
  // cached by the vehicle screen), unless the user typed something.
  useEffect(() => {
    if (vehicle && getValues("mileage") === undefined) {
      setValue("mileage", vehicle.currentMileage);
    }
  }, [vehicle, getValues, setValue]);

  const selectedType = watch("maintenanceTypeId");
  const mileage = watch("mileage");
  // Legacy warned, never blocked: a lower odometer is a past service.
  const pastService =
    vehicle !== undefined && mileage !== undefined && mileage < vehicle.currentMileage;

  const chooseReceipt = async (source: "camera" | "library" | "pdf") => {
    setReceiptError(null);
    try {
      const picked = source === "pdf" ? await pickReceiptPdf() : await pickReceiptPhoto(source);
      if (picked) {
        discardPickedReceipt(receipt);
        setReceipt(picked);
      }
    } catch (error) {
      if (__DEV__) console.warn("Receipt pick failed:", error);
      // Inline: this screen is an iOS modal, and the toast renders behind it.
      setReceiptError(
        error instanceof CameraPermissionError
          ? "Permita o acesso à câmera nas configurações do aparelho para fotografar o comprovante."
          : error instanceof ReceiptTooLargeError
            ? "O PDF precisa ter até 10 MB."
            : "Não foi possível abrir o comprovante.",
      );
    }
  };

  const onSubmit = async (data: CreateMaintenanceRecordInput) => {
    setSubmitError(null);
    let created: MaintenanceRecord;
    try {
      created = await apiFetch<MaintenanceRecord>(`/vehicles/${vehicleId}/maintenance-records`, {
        method: "POST",
        body: JSON.stringify({
          ...data,
          location: data.location || undefined,
          notes: data.notes || undefined,
        }),
      });
    } catch (error) {
      haptic.error();
      setSubmitError(
        error instanceof ApiError && error.statusCode === 404
          ? "Esse veículo não existe mais."
          : "Algo deu errado. Tente novamente.",
      );
      return;
    }
    // Separate request, never blocking the save (same rule as the vehicle
    // photo): the maintenance is registered either way.
    if (receipt) {
      try {
        await uploadReceipt(vehicleId, created.id, receipt);
        discardPickedReceipt(receipt);
      } catch (error) {
        if (__DEV__) console.warn("Receipt upload failed:", error);
        useToastStore
          .getState()
          .show(
            error instanceof ApiError && (error.statusCode === 413 || error.statusCode === 400)
              ? "Manutenção salva, mas o comprovante precisa ser uma foto ou PDF de até 10 MB."
              : "Manutenção salva, mas não foi possível enviar o comprovante. Anexe de novo pelo histórico.",
            { tone: "warning" },
          );
      }
    }
    const vehicleChanged = !vehicle || data.mileage > vehicle.currentMileage;
    for (const queryKey of maintenanceQueryKeys(vehicleId, { vehicleChanged })) {
      void queryClient.invalidateQueries({ queryKey });
    }
    haptic.success();
    navigation.goBack();
  };

  const types = typesQuery.data;

  return (
    <FormScreen
      title="Registrar manutenção"
      onClose={() => navigation.goBack()}
      footer={
        <>
          {submitError ? <InlineNotice tone="danger" message={submitError} /> : null}
          <Button
            testID="submit-button"
            label="Registrar manutenção"
            onPress={handleSubmit(onSubmit)}
            loading={isSubmitting}
          />
        </>
      }
    >
      <Field label="Qual manutenção" error={errors.maintenanceTypeId?.message}>
        {typesQuery.isError ? (
          <InlineNotice tone="danger" message="Não foi possível carregar os tipos." />
        ) : !types ? (
          <Skeleton height={44} radius="full" />
        ) : (
          <View style={styles.groups} testID="maintenance-type-options">
            {groupBySystem(types).map((group) => (
              <View key={group.title} style={styles.group}>
                <Text variant="caption" tone="subtle">
                  {group.title}
                </Text>
                <View style={styles.chips}>
                  {group.items.map((type) => (
                    <SelectChip
                      key={type.id}
                      testID={`maintenance-type-option-${type.id}`}
                      label={type.name}
                      selected={type.id === selectedType}
                      onPress={() =>
                        setValue("maintenanceTypeId", type.id, { shouldValidate: true })
                      }
                    />
                  ))}
                </View>
              </View>
            ))}
            <View style={styles.chips}>
              <SelectChip
                testID="create-maintenance-type-chip"
                label={types.length === 0 ? "Cadastrar o primeiro tipo" : "Novo tipo"}
                icon="add"
                dashed
                selected={false}
                onPress={() => navigation.navigate("MaintenanceTypeForm")}
              />
            </View>
          </View>
        )}
      </Field>

      <Card style={styles.card}>
        <Controller
          control={control}
          name="mileage"
          render={({ field }) => (
            <TextField
              testID="mileage-input"
              label="Quilometragem no dia (km)"
              leftIcon="speedometer-outline"
              value={numberText(field.value)}
              onChangeText={(text) => field.onChange(parseIntegerInput(text))}
              keyboardType="number-pad"
              placeholder={vehicle ? String(vehicle.currentMileage) : "0"}
              error={errors.mileage?.message}
            />
          )}
        />
        {pastService && vehicle ? (
          <InlineNotice
            testID="past-service-notice"
            tone="warning"
            message={`É menos que a quilometragem atual do veículo (${formatMileage(vehicle.currentMileage)}). Vai ficar registrada como uma manutenção passada.`}
          />
        ) : null}
        <Controller
          control={control}
          name="date"
          render={({ field }) => (
            <TextField
              testID="date-input"
              label="Data"
              leftIcon="calendar-outline"
              value={dateDisplay}
              onChangeText={(text) => {
                setDateDisplay(formatDateInputDigits(text));
                field.onChange(parseDateInputToISO(text));
              }}
              keyboardType="number-pad"
              placeholder="DD/MM/AAAA"
              maxLength={10}
              error={errors.date?.message}
            />
          )}
        />
      </Card>

      <Controller
        control={control}
        name="cost"
        render={({ field }) => (
          <AmountField
            testID="cost-input"
            label="Quanto custou (opcional)"
            size="compact"
            value={field.value}
            onChangeValue={field.onChange}
            error={errors.cost?.message}
          />
        )}
      />

      <Card style={styles.card}>
        <Controller
          control={control}
          name="location"
          render={({ field }) => (
            <TextField
              testID="location-input"
              label="Onde (opcional)"
              leftIcon="location-outline"
              value={field.value ?? ""}
              onChangeText={field.onChange}
              placeholder="Ex.: Auto Center Silva"
              maxLength={100}
              error={errors.location?.message}
            />
          )}
        />
        <Controller
          control={control}
          name="notes"
          render={({ field }) => (
            <TextField
              testID="notes-input"
              label="Observações (opcional)"
              value={field.value ?? ""}
              onChangeText={field.onChange}
              placeholder="Ex.: trocado também o filtro de ar"
              multiline
              maxLength={500}
              error={errors.notes?.message}
            />
          )}
        />
      </Card>

      <Card style={styles.card}>
        <Text variant="headline">Comprovante (opcional)</Text>
        {receipt ? (
          <View style={styles.receipt} testID="receipt-preview">
            {receipt.kind === "IMAGE" ? (
              <Image
                source={{ uri: receipt.uri }}
                style={[styles.receiptThumb, { backgroundColor: colors.surfaceMuted }]}
                accessibilityIgnoresInvertColors
              />
            ) : (
              <View
                style={[styles.receiptThumb, styles.pdf, { backgroundColor: colors.dangerMuted }]}
              >
                <Icon name="document-text" size="lg" color={colors.danger} />
              </View>
            )}
            <Text variant="callout" numberOfLines={2} style={styles.flex}>
              {receipt.kind === "PDF" ? (receipt.name ?? "Documento PDF") : "Foto do comprovante"}
            </Text>
            <IconButton
              testID="remove-receipt-button"
              icon="close"
              variant="soft"
              accessibilityLabel="Remover comprovante"
              onPress={() => {
                discardPickedReceipt(receipt);
                setReceipt(null);
              }}
            />
          </View>
        ) : (
          <Text variant="footnote" tone="muted">
            Nota fiscal, ordem de serviço ou recibo: foto ou PDF de até 10 MB.
          </Text>
        )}
        {receiptError ? <InlineNotice tone="danger" message={receiptError} /> : null}
        <View style={styles.receiptActions}>
          <Button
            testID="receipt-camera-button"
            label="Câmera"
            leftIcon="camera-outline"
            variant="secondary"
            size="sm"
            fullWidth={false}
            style={styles.flex}
            onPress={() => void chooseReceipt("camera")}
          />
          <Button
            testID="receipt-library-button"
            label="Galeria"
            leftIcon="image-outline"
            variant="secondary"
            size="sm"
            fullWidth={false}
            style={styles.flex}
            onPress={() => void chooseReceipt("library")}
          />
          <Button
            testID="receipt-pdf-button"
            label="PDF"
            leftIcon="document-outline"
            variant="secondary"
            size="sm"
            fullWidth={false}
            style={styles.flex}
            onPress={() => void chooseReceipt("pdf")}
          />
        </View>
      </Card>
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
  groups: {
    gap: space.md,
  },
  group: {
    gap: space.xs,
  },
  chips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: space.sm,
  },
  receipt: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
  },
  receiptThumb: {
    width: 56,
    height: 56,
    borderRadius: radius.md,
  },
  pdf: {
    alignItems: "center",
    justifyContent: "center",
  },
  receiptActions: {
    flexDirection: "row",
    gap: space.sm,
  },
});
