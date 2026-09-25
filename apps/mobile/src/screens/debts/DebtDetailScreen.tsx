import { Ionicons } from "@expo/vector-icons";
import {
  formatCurrency,
  type Debt,
  type DebtInstallment,
  type DebtWithInstallments,
  type PayInstallmentInput,
} from "@mony/shared-types";
import { color, radius, size as sizeTokens, spacing } from "@mony/ui-tokens";
import { useNavigation, useRoute, type RouteProp } from "@react-navigation/native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { memo, useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  View,
  type ListRenderItem,
} from "react-native";

import { AppHeader, Badge, Button, ProgressBar, Screen, Text } from "../../components/ui";
import { ApiError, apiFetch } from "../../lib/api-client";
import { formatDateDisplay } from "../../lib/date-mask";
import {
  DEBT_RELATED_QUERY_KEYS,
  DEBT_STATUS_LABELS,
  DEBT_STATUS_TONES,
  installmentProgressPercent,
} from "../../lib/debt-display";
import type { AppStackNavigation, AppStackParamList } from "../../navigation/RootNavigator";

import { PayInstallmentSheet } from "./PayInstallmentSheet";

// Route params stay small — the edit form only needs the debt's own
// fields, not its (up to a few hundred) installments.
function withoutInstallments({ installments: _installments, ...debt }: DebtWithInstallments): Debt {
  return debt;
}

export function DebtDetailScreen() {
  const navigation = useNavigation<AppStackNavigation>();
  const route = useRoute<RouteProp<AppStackParamList, "DebtDetail">>();
  const { debtId } = route.params;
  const queryClient = useQueryClient();
  const [payingInstallment, setPayingInstallment] = useState<DebtInstallment | null>(null);
  const [payError, setPayError] = useState<string | null>(null);

  const {
    data: debt,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["debt", debtId],
    queryFn: () => apiFetch<DebtWithInstallments>(`/debts/${debtId}`),
  });

  // Pay/cancel respond with the updated debt — seed this screen's cache
  // with it directly, and invalidate everything else the linked
  // transactions affect (lists, dashboard totals).
  const applyUpdatedDebt = async (updated: DebtWithInstallments) => {
    queryClient.setQueryData(["debt", debtId], updated);
    await Promise.all(
      DEBT_RELATED_QUERY_KEYS.filter((key) => key[0] !== "debt").map((queryKey) =>
        queryClient.invalidateQueries({ queryKey }),
      ),
    );
  };

  const payMutation = useMutation({
    mutationFn: ({ installmentId, input }: { installmentId: string; input: PayInstallmentInput }) =>
      apiFetch<DebtWithInstallments>(`/debts/${debtId}/installments/${installmentId}/pay`, {
        method: "POST",
        body: JSON.stringify(input),
      }),
    onSuccess: async (updated) => {
      setPayingInstallment(null);
      await applyUpdatedDebt(updated);
    },
    onError: (error) => {
      // The form validates date/amount itself, so the 400 left is someone
      // (another device, or the transactions list) paying it in the
      // meantime — refetch so the row shows that.
      const alreadyPaid = error instanceof ApiError && error.statusCode === 400;
      if (alreadyPaid) {
        void queryClient.invalidateQueries({ queryKey: ["debt", debtId] });
      }
      setPayError(
        alreadyPaid
          ? "Esta parcela já está paga."
          : "Não foi possível registrar o pagamento. Tente novamente.",
      );
    },
  });

  const cancelMutation = useMutation({
    mutationFn: (installmentId: string) =>
      apiFetch<DebtWithInstallments>(
        `/debts/${debtId}/installments/${installmentId}/cancel-payment`,
        { method: "POST" },
      ),
    onSuccess: applyUpdatedDebt,
    onError: () => Alert.alert("Erro", "Não foi possível desfazer o pagamento. Tente novamente."),
  });

  const deleteMutation = useMutation({
    mutationFn: () => apiFetch(`/debts/${debtId}`, { method: "DELETE" }),
    onSuccess: async () => {
      queryClient.removeQueries({ queryKey: ["debt", debtId] });
      await Promise.all(
        DEBT_RELATED_QUERY_KEYS.map((queryKey) => queryClient.invalidateQueries({ queryKey })),
      );
      navigation.goBack();
    },
    onError: () => Alert.alert("Erro", "Não foi possível excluir. Tente novamente."),
  });

  // Row callbacks stay referentially stable (`mutate` is stable in
  // TanStack Query v5) so the memoized InstallmentRow below only
  // re-renders the row whose own props changed — not every mounted row
  // (up to a few hundred) on each sheet open / mutation state change.
  const { mutate: cancelPayment } = cancelMutation;
  const confirmCancel = useCallback(
    (installment: DebtInstallment) => {
      Alert.alert(
        "Desfazer pagamento",
        `Marcar a parcela ${installment.installmentNo} como pendente de novo?`,
        [
          { text: "Voltar", style: "cancel" },
          {
            text: "Sim, desfazer",
            style: "destructive",
            onPress: () => cancelPayment(installment.id),
          },
        ],
      );
    },
    [cancelPayment],
  );

  const openPaySheet = useCallback((installment: DebtInstallment) => {
    setPayError(null);
    setPayingInstallment(installment);
  }, []);

  const confirmDelete = () => {
    if (!debt) return;
    Alert.alert(
      "Excluir dívida",
      `Excluir "${debt.name}"? As transações das parcelas também serão excluídas.`,
      [
        { text: "Cancelar", style: "cancel" },
        { text: "Excluir", style: "destructive", onPress: () => deleteMutation.mutate() },
      ],
    );
  };

  // UTC date on purpose (unlike the pay sheet's default, which is the
  // user's local calendar): the server flips a debt to OVERDUE using the
  // UTC date, so the per-row "Vencida" badge must agree with it.
  const today = new Date().toISOString().slice(0, 10);
  const cancellingId = cancelMutation.isPending ? cancelMutation.variables : undefined;

  const renderInstallment = useCallback<ListRenderItem<DebtInstallment>>(
    ({ item }) => (
      <InstallmentRow
        installment={item}
        overdue={item.status === "PENDING" && item.dueDate < today}
        cancelling={cancellingId === item.id}
        onPay={openPaySheet}
        onCancel={confirmCancel}
      />
    ),
    [today, cancellingId, openPaySheet, confirmCancel],
  );

  return (
    <Screen scrollable={false}>
      <AppHeader
        title={debt?.name ?? "Dívida"}
        onBack={() => navigation.goBack()}
        rightAccessory={
          debt && (
            <View style={styles.headerActions}>
              <TouchableOpacity
                testID="edit-debt-button"
                accessibilityRole="button"
                accessibilityLabel="Editar dívida"
                hitSlop={8}
                onPress={() => navigation.navigate("DebtForm", { debt: withoutInstallments(debt) })}
              >
                <Ionicons name="pencil-outline" size={sizeTokens.iconLg} color={color.primary} />
              </TouchableOpacity>
              <TouchableOpacity
                testID="delete-debt-button"
                accessibilityRole="button"
                accessibilityLabel="Excluir dívida"
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

      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={color.primary} />
        </View>
      ) : isError || !debt ? (
        <Text variant="caption" color={color.danger}>
          Algo deu errado. Tente novamente.
        </Text>
      ) : (
        // FlatList, not a mapped ScrollView — a long financing can have
        // hundreds of installments.
        <FlatList
          testID="installments-list"
          data={debt.installments}
          keyExtractor={(installment) => installment.id}
          ListHeaderComponent={<DebtSummary debt={debt} />}
          contentContainerStyle={styles.listContent}
          renderItem={renderInstallment}
        />
      )}

      <PayInstallmentSheet
        installment={payingInstallment}
        submitting={payMutation.isPending}
        error={payError}
        onClose={() => setPayingInstallment(null)}
        onSubmit={(input) => {
          if (!payingInstallment) return;
          setPayError(null);
          payMutation.mutate({ installmentId: payingInstallment.id, input });
        }}
      />
    </Screen>
  );
}

// Memoized: rendered as the list header, it would otherwise re-render on
// every parent state change even though only `debt` feeds it.
const DebtSummary = memo(function DebtSummary({ debt }: { debt: DebtWithInstallments }) {
  return (
    <View style={styles.summaryContainer}>
      <View style={styles.summary} testID="debt-summary">
        <Badge
          testID="debt-status"
          label={DEBT_STATUS_LABELS[debt.status]}
          tone={DEBT_STATUS_TONES[debt.status]}
        />
        <View style={styles.amounts}>
          <Amount label="Total" value={debt.totalAmount} />
          <Amount label="Pago" value={debt.paidAmount} testID="debt-paid-amount" />
          <Amount label="Restante" value={debt.remainingAmount} testID="debt-remaining-amount" />
        </View>
        <ProgressBar
          percent={installmentProgressPercent(debt.paidInstallments, debt.totalInstallments)}
        />
        <Text variant="caption" testID="debt-installments-progress">
          {debt.paidInstallments} de {debt.totalInstallments} parcelas pagas
        </Text>
        <Text variant="caption">
          Início {formatDateDisplay(debt.startDate)}
          {debt.endDate ? ` · Término ${formatDateDisplay(debt.endDate)}` : ""}
        </Text>
        {debt.interestRate && (
          <Text variant="caption">
            Juros {debt.interestRate.replace(".", ",")}% a.m. (apenas informativo)
          </Text>
        )}
        {debt.notes && <Text variant="caption">{debt.notes}</Text>}
      </View>
      <Text variant="bodyStrong">Parcelas</Text>
    </View>
  );
});

function Amount({ label, value, testID }: { label: string; value: string; testID?: string }) {
  return (
    <View style={styles.amount}>
      <Text variant="caption">{label}</Text>
      <Text variant="bodyStrong" testID={testID}>
        {formatCurrency(value)}
      </Text>
    </View>
  );
}

interface InstallmentRowProps {
  installment: DebtInstallment;
  overdue: boolean;
  cancelling: boolean;
  onPay: (installment: DebtInstallment) => void;
  onCancel: (installment: DebtInstallment) => void;
}

// Memoized with stable `onPay`/`onCancel` from the screen; TanStack
// Query's structural sharing keeps unchanged installments' object
// identity across refetches/setQueryData, so a payment re-renders only
// the paid row.
const InstallmentRow = memo(function InstallmentRow({
  installment,
  overdue,
  cancelling,
  onPay,
  onCancel,
}: InstallmentRowProps) {
  const paid = installment.status === "PAID";

  return (
    <View style={styles.installmentRow} testID={`installment-row-${installment.installmentNo}`}>
      <View style={styles.installmentMain}>
        <View style={styles.installmentHeader}>
          <Text variant="bodyStrong">Parcela {installment.installmentNo}</Text>
          <Badge
            testID={`installment-status-${installment.installmentNo}`}
            label={paid ? "Paga" : overdue ? "Vencida" : "Pendente"}
            tone={paid ? "success" : overdue ? "danger" : "neutral"}
          />
        </View>
        <Text variant="caption">
          {formatCurrency(installment.amount)} · vence {formatDateDisplay(installment.dueDate)}
        </Text>
        {paid && installment.paymentDate && (
          <Text variant="caption">Paga em {formatDateDisplay(installment.paymentDate)}</Text>
        )}
      </View>
      {paid ? (
        <Button
          testID={`cancel-payment-${installment.installmentNo}`}
          label="Desfazer"
          variant="ghost"
          fullWidth={false}
          loading={cancelling}
          onPress={() => onCancel(installment)}
        />
      ) : (
        <Button
          testID={`pay-installment-${installment.installmentNo}`}
          label="Pagar"
          variant="secondary"
          fullWidth={false}
          onPress={() => onPay(installment)}
        />
      )}
    </View>
  );
});

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
  listContent: {
    gap: spacing.sm,
    paddingBottom: spacing.lg,
  },
  summaryContainer: {
    gap: spacing.md,
    marginBottom: spacing.xs,
  },
  summary: {
    gap: spacing.sm,
    padding: spacing.md,
    backgroundColor: color.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: color.border,
  },
  amounts: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  amount: {
    gap: spacing.xxs,
  },
  installmentRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    padding: spacing.md,
    backgroundColor: color.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: color.border,
  },
  installmentMain: {
    flex: 1,
    gap: spacing.xxs,
  },
  installmentHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
});
