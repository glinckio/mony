import type { MaintenanceAlertStatus, MaintenanceRecord } from "@mony/shared-types";
import { useNavigation, useRoute, type RouteProp } from "@react-navigation/native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { memo, useCallback, useState } from "react";
import { Image, StyleSheet, View } from "react-native";

import { MaintenanceAlertRow } from "../../components/domain";
import {
  Button,
  Card,
  EmptyState,
  ErrorState,
  Icon,
  IconButton,
  InlineNotice,
  PaperSheet,
  Rule,
  ScrollScreen,
  SegmentedControl,
  Skeleton,
  Text,
  Touchable,
} from "../../components/ui";
import { ApiError, apiFetch } from "../../lib/api-client";
import { formatDateDisplay } from "../../lib/date-mask";
import { maintenanceQueryKeys, systemLabel } from "../../lib/maintenance-display";
import {
  CameraPermissionError,
  ReceiptTooLargeError,
  discardPickedReceipt,
  openReceiptPdf,
  pickReceiptPdf,
  pickReceiptPhoto,
  uploadReceipt,
} from "../../lib/maintenance-receipt";
import { formatMoney, spokenMoney, toCents } from "../../lib/money-display";
import { formatMileage } from "../../lib/vehicle-display";
import type { AppStackNavigation, AppStackParamList } from "../../navigation/RootNavigator";
import { radius, space, useTheme } from "../../theme";

type Tab = "alerts" | "history";

const RECEIPT_SOURCES = [
  ["camera", "Câmera", "camera-outline"],
  ["library", "Galeria", "image-outline"],
  ["pdf", "PDF", "document-outline"],
] as const;

const TABS: Array<{ value: Tab; label: string }> = [
  { value: "alerts", label: "Alertas" },
  { value: "history", label: "Histórico" },
];

// Manutenções (design/telas.md → Manutenção): every tracked type with its
// live status (tap to register it), and the history with what was spent —
// a record opens in a sheet with its receipt and the delete action.
export function MaintenanceScreen() {
  const navigation = useNavigation<AppStackNavigation>();
  const route = useRoute<RouteProp<AppStackParamList, "Maintenance">>();
  const { vehicleId } = route.params;
  const [tab, setTab] = useState<Tab>(route.params.tab ?? "alerts");
  // By id, so the sheet always shows the latest copy (a new receipt, or
  // a re-signed URL after the old one expired).
  const [openRecordId, setOpenRecordId] = useState<string | null>(null);

  const alerts = useQuery({
    queryKey: ["maintenance-alerts", vehicleId],
    queryFn: () => apiFetch<MaintenanceAlertStatus[]>(`/vehicles/${vehicleId}/maintenance-alerts`),
  });
  const records = useQuery({
    queryKey: ["maintenance-records", vehicleId],
    queryFn: () => apiFetch<MaintenanceRecord[]>(`/vehicles/${vehicleId}/maintenance-records`),
  });
  // No refetch on focus: every write (here, in the forms or the mileage
  // sheet) invalidates these keys, so a focus refetch would only repeat
  // requests already in flight.

  const register = useCallback(
    (alert?: MaintenanceAlertStatus) =>
      navigation.navigate("MaintenanceRecordForm", {
        vehicleId,
        maintenanceTypeId: alert?.maintenanceTypeId,
      }),
    [navigation, vehicleId],
  );

  return (
    <ScrollScreen
      title="Manutenções"
      onBack={() => navigation.goBack()}
      actions={
        <>
          <IconButton
            testID="maintenance-types-button"
            icon="options-outline"
            variant="soft"
            accessibilityLabel="Tipos de manutenção"
            onPress={() => navigation.navigate("MaintenanceTypes")}
          />
          <IconButton
            testID="add-maintenance-record-button"
            icon="add"
            variant="soft"
            tone="primary"
            accessibilityLabel="Registrar manutenção"
            onPress={() => register()}
          />
        </>
      }
    >
      <View style={styles.stack}>
        <SegmentedControl
          testID="maintenance-tab"
          accessibilityLabel="Ver"
          options={TABS}
          value={tab}
          onChange={setTab}
        />

        {tab === "alerts" ? (
          alerts.isError ? (
            <ErrorState onRetry={() => void alerts.refetch()} />
          ) : !alerts.data ? (
            <Skeleton height={240} radius="lg" />
          ) : alerts.data.length === 0 ? (
            <EmptyState
              icon="construct-outline"
              title="Nada sendo acompanhado ainda."
              message="Cadastre os tipos de manutenção que você quer acompanhar — troca de óleo, filtros, pneus — e o Mony avisa quando estiver chegando a hora."
              action={{
                label: "Cadastrar tipo",
                onPress: () => navigation.navigate("MaintenanceTypeForm"),
                testID: "empty-create-maintenance-type",
              }}
            />
          ) : (
            <Card testID="maintenance-alerts" style={styles.list}>
              {alerts.data.map((alert, index) => (
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
            </Card>
          )
        ) : records.isError ? (
          <ErrorState onRetry={() => void records.refetch()} />
        ) : !records.data ? (
          <Skeleton height={240} radius="lg" />
        ) : records.data.length === 0 ? (
          <EmptyState
            icon="receipt-outline"
            title="Nenhuma manutenção registrada."
            message="Registre as que você fizer e o Mony recalcula quando vem a próxima."
            action={{
              label: "Registrar manutenção",
              onPress: () => register(),
              testID: "empty-register-maintenance",
            }}
          />
        ) : (
          <History records={records.data} onOpen={setOpenRecordId} />
        )}
      </View>

      <RecordSheet
        vehicleId={vehicleId}
        record={records.data?.find((record) => record.id === openRecordId) ?? null}
        onClose={() => setOpenRecordId(null)}
      />
    </ScrollScreen>
  );
}

// Memoized: opening/closing a record's sheet re-renders the screen, not
// the list (the records array keeps its reference between fetches).
const History = memo(function History({
  records,
  onOpen,
}: {
  records: MaintenanceRecord[];
  onOpen: (recordId: string) => void;
}) {
  const { colors } = useTheme();
  const spentCents = records.reduce(
    (sum, record) => sum + (record.cost ? toCents(record.cost) : 0),
    0,
  );

  return (
    <View style={styles.stack}>
      <View style={styles.summary} testID="maintenance-summary">
        <Text variant="footnote" tone="muted" style={styles.flex}>
          {records.length} {records.length === 1 ? "manutenção" : "manutenções"}
        </Text>
        <Text variant="subhead">Gasto {formatMoney(spentCents / 100)}</Text>
      </View>
      <Card padded={false} testID="maintenance-records">
        {records.map((record, index) => (
          <View key={record.id}>
            {index > 0 ? <Rule inset={space.lg} /> : null}
            <Touchable
              testID={`maintenance-record-${record.id}`}
              feedback="row"
              accessibilityRole="button"
              accessibilityLabel={`${record.type.name}, ${formatDateDisplay(record.date)}, ${formatMileage(record.mileage)}${record.cost ? `, ${spokenMoney(record.cost)}` : ""}`}
              onPress={() => onOpen(record.id)}
              style={styles.recordRow}
            >
              <View style={styles.flex}>
                <Text variant="bodyStrong" numberOfLines={1}>
                  {record.type.name}
                </Text>
                <Text variant="footnote" tone="muted" numberOfLines={1}>
                  {formatDateDisplay(record.date)} · {formatMileage(record.mileage)}
                </Text>
              </View>
              {record.receipt ? (
                <Icon
                  name={record.receipt.kind === "PDF" ? "document-text-outline" : "image-outline"}
                  size="sm"
                  color={colors.textSubtle}
                />
              ) : null}
              <Text variant="numeral">{record.cost ? formatMoney(record.cost) : "—"}</Text>
            </Touchable>
          </View>
        ))}
      </Card>
    </View>
  );
});

// One record: details, the receipt (image inline, PDF in the in-app
// browser) with "attach/replace" — also the retry path when the form's
// upload failed — and delete, confirmed inside the same sheet (iOS can't
// present a second Modal on top of this one). Errors stay in the sheet:
// the app's toast would render behind its Modal.
function RecordSheet({
  vehicleId,
  record,
  onClose,
}: {
  vehicleId: string;
  record: MaintenanceRecord | null;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const { colors } = useTheme();
  const [confirming, setConfirming] = useState(false);
  const [choosingReceipt, setChoosingReceipt] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const receiptMutation = useMutation({
    mutationFn: async ({ id, source }: { id: string; source: "camera" | "library" | "pdf" }) => {
      const picked = source === "pdf" ? await pickReceiptPdf() : await pickReceiptPhoto(source);
      if (!picked) return null;
      try {
        return await uploadReceipt(vehicleId, id, picked);
      } finally {
        discardPickedReceipt(picked);
      }
    },
    onSuccess: (updated) => {
      if (!updated) return;
      setChoosingReceipt(false);
      queryClient.setQueryData<MaintenanceRecord[]>(["maintenance-records", vehicleId], (list) =>
        list?.map((item) => (item.id === updated.id ? updated : item)),
      );
    },
    onError: (failure) => {
      if (__DEV__) console.warn("Receipt attach failed:", failure);
      setError(
        failure instanceof CameraPermissionError
          ? "Permita o acesso à câmera nas configurações do aparelho para fotografar o comprovante."
          : failure instanceof ReceiptTooLargeError ||
              (failure instanceof ApiError &&
                (failure.statusCode === 413 || failure.statusCode === 400))
            ? "O comprovante precisa ser uma foto ou PDF de até 10 MB."
            : "Não foi possível enviar o comprovante. Tente novamente.",
      );
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      apiFetch(`/vehicles/${vehicleId}/maintenance-records/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      // Deleting never lowers the vehicle's mileage: only its maintenance
      // lists change.
      for (const queryKey of maintenanceQueryKeys(vehicleId)) {
        void queryClient.invalidateQueries({ queryKey });
      }
      close();
    },
    onError: () => setError("Não foi possível excluir. Tente novamente."),
  });

  const close = () => {
    setConfirming(false);
    setChoosingReceipt(false);
    setError(null);
    onClose();
  };

  const openPdf = async (url: string) => {
    try {
      await openReceiptPdf(url);
    } catch {
      setError("Não foi possível abrir o comprovante.");
    }
  };

  return (
    <PaperSheet
      testID="maintenance-record-sheet"
      visible={record !== null}
      dismissible={!deleteMutation.isPending && !receiptMutation.isPending}
      onClose={close}
      title={record?.type.name}
    >
      {record ? (
        confirming ? (
          <View style={styles.sheetBody}>
            <Text variant="body">
              Excluir esta manutenção? O alerta de “{record.type.name}” é recalculado a partir das
              que sobrarem.
            </Text>
            {error ? <InlineNotice tone="danger" message={error} /> : null}
            <Button
              testID="confirm-delete-record"
              label="Excluir manutenção"
              variant="danger"
              haptic="stamp"
              loading={deleteMutation.isPending}
              onPress={() => deleteMutation.mutate(record.id)}
            />
            <Button
              label="Manter"
              variant="ghost"
              disabled={deleteMutation.isPending}
              onPress={() => {
                setConfirming(false);
                setError(null);
              }}
            />
          </View>
        ) : (
          <View style={styles.sheetBody}>
            <View style={styles.details}>
              <Detail label="Sistema" value={systemLabel(record.type.system)} />
              <Detail label="Data" value={formatDateDisplay(record.date)} />
              <Detail label="Quilometragem" value={formatMileage(record.mileage)} />
              <Detail label="Valor" value={record.cost ? formatMoney(record.cost) : null} />
              <Detail label="Onde" value={record.location} />
            </View>
            {record.notes ? (
              <Text variant="callout" tone="muted">
                {record.notes}
              </Text>
            ) : null}
            {record.receipt?.kind === "IMAGE" ? (
              <Image
                testID="receipt-image"
                source={{ uri: record.receipt.url }}
                resizeMode="contain"
                // Android: decode at the box's size, not the full 2560 px.
                resizeMethod="resize"
                accessibilityLabel="Comprovante"
                // The signed URL expired (screen left open > 1 h): refetch
                // the list, which re-signs it.
                onError={() =>
                  void queryClient.invalidateQueries({
                    queryKey: ["maintenance-records", vehicleId],
                  })
                }
                style={[styles.receiptImage, { backgroundColor: colors.surfaceMuted }]}
              />
            ) : record.receipt?.kind === "PDF" ? (
              <Button
                testID="open-receipt-pdf"
                label="Abrir comprovante (PDF)"
                leftIcon="document-text-outline"
                variant="secondary"
                onPress={() => void openPdf(record.receipt!.url)}
              />
            ) : null}
            {choosingReceipt ? (
              <View style={styles.receiptActions}>
                {RECEIPT_SOURCES.map(([source, label, icon]) => (
                  <Button
                    key={source}
                    testID={`attach-receipt-${source}`}
                    label={label}
                    leftIcon={icon}
                    variant="secondary"
                    size="sm"
                    fullWidth={false}
                    style={styles.flex}
                    disabled={receiptMutation.isPending}
                    onPress={() => {
                      setError(null);
                      receiptMutation.mutate({ id: record.id, source });
                    }}
                  />
                ))}
              </View>
            ) : (
              <Button
                testID="attach-receipt-button"
                label={record.receipt ? "Trocar comprovante" : "Anexar comprovante"}
                leftIcon="attach-outline"
                variant="secondary"
                loading={receiptMutation.isPending}
                onPress={() => {
                  setError(null);
                  setChoosingReceipt(true);
                }}
              />
            )}
            {error ? <InlineNotice tone="danger" message={error} /> : null}
            <Button
              testID="delete-record-button"
              label="Excluir manutenção"
              leftIcon="trash-outline"
              variant="dangerGhost"
              onPress={() => {
                setError(null);
                setConfirming(true);
              }}
            />
          </View>
        )
      ) : null}
    </PaperSheet>
  );
}

function Detail({ label, value }: { label: string; value: string | null }) {
  return (
    <View style={styles.detailRow}>
      <Text variant="callout" tone="muted">
        {label}
      </Text>
      <Text variant="bodyStrong" style={styles.detailValue} numberOfLines={2}>
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
  list: {
    paddingVertical: space.xs,
  },
  summary: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: space.md,
    paddingHorizontal: space.xs,
  },
  recordRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
  },
  sheetBody: {
    gap: space.lg,
  },
  details: {
    gap: space.sm,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: space.lg,
  },
  detailValue: {
    flexShrink: 1,
    textAlign: "right",
  },
  receiptActions: {
    flexDirection: "row",
    gap: space.sm,
  },
  receiptImage: {
    width: "100%",
    height: 240,
    borderRadius: radius.md,
  },
});
