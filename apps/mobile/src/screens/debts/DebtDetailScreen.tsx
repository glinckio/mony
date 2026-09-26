import type {
  Debt,
  DebtInstallment,
  DebtWithInstallments,
  PayInstallmentInput,
} from "@mony/shared-types";
import { useNavigation, useRoute, type RouteProp } from "@react-navigation/native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { memo, useCallback, useState } from "react";
import { FlatList, StyleSheet, View, type ListRenderItem } from "react-native";
import Animated from "react-native-reanimated";

import { MoneyHero, StatusPill, type StatusKind } from "../../components/domain";
import {
  Button,
  Card,
  ConfirmSheet,
  ErrorState,
  Gradient,
  IconButton,
  ProgressBar,
  ScreenBackground,
  Skeleton,
  Text,
  TopBar,
  useBottomClearance,
  useScreenInsets,
  useScrollHeader,
} from "../../components/ui";
import { ApiError, apiFetch } from "../../lib/api-client";
import { formatDateDisplay } from "../../lib/date-mask";
import {
  DEBT_RELATED_QUERY_KEYS,
  DEBT_STATUS_LABELS,
  installmentProgressPercent,
} from "../../lib/debt-display";
import { formatMoney, spokenMoney } from "../../lib/money-display";
import { useToastStore } from "../../lib/toast-store";
import type { AppStackNavigation, AppStackParamList } from "../../navigation/RootNavigator";
import { layout, radius, space, useTheme } from "../../theme";
import { haptic } from "../../theme/haptics";

import { PayInstallmentSheet } from "./PayInstallmentSheet";

const AnimatedFlatList = Animated.createAnimatedComponent(FlatList<DebtInstallment>);

const DEBT_KIND: Record<Debt["status"], StatusKind> = {
  ACTIVE: "debtActive",
  OVERDUE: "debtOverdue",
  PAID_OFF: "debtPaidOff",
};

// Route params stay small — the edit form only needs the debt's own
// fields, not its (up to a few hundred) installments.
function withoutInstallments({ installments: _installments, ...debt }: DebtWithInstallments): Debt {
  return debt;
}

// Dívida (design/telas.md §10): what's left on a gradient card, the
// debt's details, then the installments — each its own row with the pay
// action or the paid pill (tap to undo).
export function DebtDetailScreen() {
  const navigation = useNavigation<AppStackNavigation>();
  const route = useRoute<RouteProp<AppStackParamList, "DebtDetail">>();
  const { debtId } = route.params;
  const queryClient = useQueryClient();
  const { colors } = useTheme();
  const { scrollY, onScroll } = useScrollHeader();
  const insets = useScreenInsets();
  const bottom = useBottomClearance();
  const [payingInstallment, setPayingInstallment] = useState<DebtInstallment | null>(null);
  const [payError, setPayError] = useState<string | null>(null);
  const [undoing, setUndoing] = useState<DebtInstallment | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const {
    data: debt,
    isLoading,
    isError,
    refetch,
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
      haptic.success();
      useToastStore
        .getState()
        .show(
          updated.status === "PAID_OFF" ? "Dívida quitada. Parabéns!" : "Pagamento registrado.",
          {
            tone: "success",
          },
        );
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
        {
          method: "POST",
        },
      ),
    onSuccess: async (updated) => {
      setUndoing(null);
      await applyUpdatedDebt(updated);
    },
    onError: () => {
      setUndoing(null);
      useToastStore.getState().show("Não foi possível desfazer o pagamento. Tente novamente.");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => apiFetch(`/debts/${debtId}`, { method: "DELETE" }),
    onSuccess: async () => {
      setConfirmDelete(false);
      queryClient.removeQueries({ queryKey: ["debt", debtId] });
      await Promise.all(
        DEBT_RELATED_QUERY_KEYS.map((queryKey) => queryClient.invalidateQueries({ queryKey })),
      );
      navigation.goBack();
    },
    onError: () => {
      setConfirmDelete(false);
      useToastStore.getState().show("Não foi possível excluir. Tente novamente.");
    },
  });

  // Row callbacks stay referentially stable so the memoized
  // InstallmentRow only re-renders the row whose own props changed — not
  // every mounted row (up to a few hundred) on each state change.
  const openPaySheet = useCallback((installment: DebtInstallment) => {
    setPayError(null);
    setPayingInstallment(installment);
  }, []);
  const askUndo = useCallback((installment: DebtInstallment) => setUndoing(installment), []);

  // UTC date on purpose (unlike the pay sheet's default, which is the
  // user's local calendar): the server flips a debt to OVERDUE using the
  // UTC date, so the per-row "Vencida" pill must agree with it.
  const today = new Date().toISOString().slice(0, 10);
  const cancellingId = cancelMutation.isPending ? cancelMutation.variables : undefined;

  const renderInstallment = useCallback<ListRenderItem<DebtInstallment>>(
    ({ item }) => (
      <InstallmentRow
        installment={item}
        overdue={item.status === "PENDING" && item.dueDate < today}
        cancelling={cancellingId === item.id}
        onPay={openPaySheet}
        onUndo={askUndo}
      />
    ),
    [today, cancellingId, openPaySheet, askUndo],
  );

  return (
    <View style={[styles.flex, { backgroundColor: colors.background }]}>
      <ScreenBackground />
      {isLoading ? (
        <View style={[insets, styles.loading]}>
          <Skeleton height={180} radius="xl" />
          <Skeleton height={110} radius="lg" />
          {[0, 1, 2].map((index) => (
            <Skeleton key={index} height={72} radius="lg" />
          ))}
        </View>
      ) : isError || !debt ? (
        <View style={insets}>
          <ErrorState onRetry={() => void refetch()} />
        </View>
      ) : (
        // FlatList, not a mapped ScrollView — a long financing can have
        // hundreds of installments.
        <AnimatedFlatList
          testID="installments-list"
          data={debt.installments}
          keyExtractor={(installment) => installment.id}
          ListHeaderComponent={<DebtSummary debt={debt} />}
          renderItem={renderInstallment}
          onScroll={onScroll}
          scrollEventThrottle={16}
          contentContainerStyle={[insets, styles.listContent, { paddingBottom: bottom }]}
        />
      )}

      <TopBar
        scrollY={scrollY}
        threshold={8}
        title={debt?.name ?? "Dívida"}
        onBack={() => navigation.goBack()}
        actions={
          debt ? (
            <>
              <IconButton
                testID="edit-debt-button"
                icon="pencil"
                variant="soft"
                accessibilityLabel="Editar dívida"
                onPress={() => navigation.navigate("DebtForm", { debt: withoutInstallments(debt) })}
              />
              <IconButton
                testID="delete-debt-button"
                icon="trash-outline"
                variant="soft"
                tone="danger"
                accessibilityLabel="Excluir dívida"
                disabled={deleteMutation.isPending}
                onPress={() => setConfirmDelete(true)}
              />
            </>
          ) : null
        }
      />

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

      <ConfirmSheet
        visible={undoing !== null}
        tone="warning"
        title={undoing ? `Desfazer o pagamento da parcela ${undoing.installmentNo}?` : ""}
        message="Ela volta a ficar a pagar."
        confirmLabel="Desfazer pagamento"
        cancelLabel="Voltar"
        busy={cancelMutation.isPending}
        onConfirm={() => {
          if (undoing) cancelMutation.mutate(undoing.id);
        }}
        onClose={() => setUndoing(null)}
      />

      <ConfirmSheet
        visible={confirmDelete}
        title={debt ? `Excluir "${debt.name}"?` : ""}
        message={
          debt
            ? `As ${debt.totalInstallments} parcelas e as transações delas também serão excluídas.`
            : undefined
        }
        confirmLabel="Excluir dívida"
        busy={deleteMutation.isPending}
        onConfirm={() => deleteMutation.mutate()}
        onClose={() => setConfirmDelete(false)}
      />
    </View>
  );
}

// Memoized: rendered as the list header, it would otherwise re-render on
// every parent state change even though only `debt` feeds it.
const DebtSummary = memo(function DebtSummary({ debt }: { debt: DebtWithInstallments }) {
  const { colors, elevation } = useTheme();
  const percent = installmentProgressPercent(debt.paidInstallments, debt.totalInstallments);
  return (
    <View style={styles.summaryContainer}>
      <View
        testID="debt-summary"
        style={[styles.hero, elevation("lg"), { shadowColor: colors.primary }]}
      >
        <Gradient name="balance" style={[StyleSheet.absoluteFill, styles.heroFill]} />
        <View style={styles.heroTop}>
          <Text variant="subhead" color={colors.onGlassMuted} style={styles.flex}>
            {debt.status === "PAID_OFF" ? "Dívida quitada" : "Restam"}
          </Text>
          <View style={[styles.statusChip, { backgroundColor: colors.surface }]}>
            <StatusPill
              kind={DEBT_KIND[debt.status]}
              testID="debt-status"
              accessibilityLabel={DEBT_STATUS_LABELS[debt.status]}
            />
          </View>
        </View>
        <MoneyHero
          testID="debt-remaining-amount"
          value={debt.remainingAmount}
          color={colors.onGlass}
          accessibilityLabel={`Restam ${spokenMoney(debt.remainingAmount)}`}
        />
        <View style={styles.track}>
          <ProgressBar
            percent={percent}
            tone="glass"
            accessibilityLabel={`${debt.paidInstallments} de ${debt.totalInstallments} parcelas pagas`}
          />
        </View>
        <View style={styles.heroBottom}>
          <Text variant="footnote" color={colors.onGlassMuted} testID="debt-installments-progress">
            {debt.paidInstallments} de {debt.totalInstallments} parcelas pagas
          </Text>
          <Text variant="footnote" color={colors.onGlassMuted}>
            Pago{" "}
            <Text variant="footnote" color={colors.onGlass} inline testID="debt-paid-amount">
              {formatMoney(debt.paidAmount)}
            </Text>
          </Text>
        </View>
      </View>

      <Card style={styles.details}>
        <DetailRow label="Valor total" value={formatMoney(debt.totalAmount)} />
        <DetailRow label="Início" value={formatDateDisplay(debt.startDate)} />
        {debt.endDate ? (
          <DetailRow label="Término" value={formatDateDisplay(debt.endDate)} />
        ) : null}
        {debt.interestRate ? (
          <DetailRow
            label="Juros"
            value={`${debt.interestRate.replace(".", ",")}% a.m.`}
            hint="Valor apenas informativo — as parcelas são sempre iguais."
          />
        ) : null}
        {debt.notes ? (
          <View style={styles.notes}>
            <Text variant="subhead" tone="muted">
              Observações
            </Text>
            <Text variant="callout">{debt.notes}</Text>
          </View>
        ) : null}
      </Card>

      <Text variant="title2" accessibilityRole="header">
        Parcelas
      </Text>
    </View>
  );
});

function DetailRow({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <View style={styles.detailRow}>
      <View style={styles.flex}>
        <Text variant="callout" tone="muted">
          {label}
        </Text>
        {hint ? (
          <Text variant="footnote" tone="subtle">
            {hint}
          </Text>
        ) : null}
      </View>
      <Text variant="numeral">{value}</Text>
    </View>
  );
}

interface InstallmentRowProps {
  installment: DebtInstallment;
  overdue: boolean;
  cancelling: boolean;
  onPay: (installment: DebtInstallment) => void;
  onUndo: (installment: DebtInstallment) => void;
}

// Memoized with stable callbacks from the screen; TanStack Query's
// structural sharing keeps unchanged installments' identity across
// refetches, so a payment re-renders only the paid row.
const InstallmentRow = memo(function InstallmentRow({
  installment,
  overdue,
  cancelling,
  onPay,
  onUndo,
}: InstallmentRowProps) {
  const { colors, elevation } = useTheme();
  const paid = installment.status === "PAID";
  const number = String(installment.installmentNo).padStart(2, "0");

  return (
    <View
      testID={`installment-row-${installment.installmentNo}`}
      style={[styles.row, { backgroundColor: colors.surface }, elevation("sm")]}
    >
      <View
        style={[
          styles.number,
          {
            backgroundColor: paid
              ? colors.successMuted
              : overdue
                ? colors.dangerMuted
                : colors.primaryMuted,
          },
        ]}
      >
        <Text
          variant="subhead"
          color={paid ? colors.onSuccessMuted : overdue ? colors.onDangerMuted : colors.primary}
        >
          {number}
        </Text>
      </View>
      <View style={styles.flex}>
        <Text variant="numeral">{formatMoney(installment.amount)}</Text>
        <Text variant="footnote" tone={overdue ? "danger" : "muted"}>
          {paid && installment.paymentDate
            ? `Paga em ${formatDateDisplay(installment.paymentDate)}`
            : `Vence ${formatDateDisplay(installment.dueDate)}`}
        </Text>
      </View>
      <View style={styles.rowSide}>
        <StatusPill
          testID={`installment-status-${installment.installmentNo}`}
          kind={paid ? "installmentPaid" : overdue ? "installmentOverdue" : "installmentPending"}
        />
        {paid ? (
          <Button
            testID={`cancel-payment-${installment.installmentNo}`}
            label="Desfazer"
            variant="ghost"
            size="sm"
            fullWidth={false}
            loading={cancelling}
            onPress={() => onUndo(installment)}
          />
        ) : (
          <Button
            testID={`pay-installment-${installment.installmentNo}`}
            label="Pagar"
            size="sm"
            fullWidth={false}
            onPress={() => onPay(installment)}
          />
        )}
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  loading: {
    gap: space.md,
  },
  listContent: {
    width: "100%",
    maxWidth: layout.maxContentWidth,
    alignSelf: "center",
    gap: space.sm + 2,
  },
  summaryContainer: {
    gap: space.xl,
    marginBottom: space.xs,
  },
  hero: {
    borderRadius: radius.xl,
    padding: space.xl,
    gap: space.sm,
  },
  heroFill: {
    borderRadius: radius.xl,
  },
  heroTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
  },
  statusChip: {
    borderRadius: radius.full,
  },
  track: {
    marginTop: space.xs,
  },
  heroBottom: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: space.md,
  },
  details: {
    gap: space.md,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: space.md,
  },
  notes: {
    gap: space.xs,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
    padding: space.md,
    borderRadius: radius.lg,
  },
  number: {
    width: 44,
    height: 44,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  rowSide: {
    alignItems: "flex-end",
    gap: space.xs,
  },
});
