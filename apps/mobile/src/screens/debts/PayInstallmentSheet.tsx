import { zodResolver } from "@hookform/resolvers/zod";
import {
  payInstallmentInputSchema,
  type DebtInstallment,
  type PayInstallmentInput,
} from "@mony/shared-types";
import { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { StyleSheet, View } from "react-native";

import { AmountField } from "../../components/domain";
import { Button, IconBadge, InlineNotice, PaperSheet, Text, TextField } from "../../components/ui";
import {
  formatDateDisplay,
  formatDateInputDigits,
  localTodayISO,
  parseDateInputToISO,
} from "../../lib/date-mask";
import { formatMoney } from "../../lib/money-display";
import { radius, space, useTheme } from "../../theme";

interface PayInstallmentSheetProps {
  // null = closed.
  installment: DebtInstallment | null;
  submitting: boolean;
  error: string | null;
  onClose: () => void;
  onSubmit: (input: PayInstallmentInput) => void;
}

// Payment date defaults to today, amount to the installment's own amount
// (design.md). The amount only matters server-side when the linked
// transaction has to be recreated — it never overwrites the installment.
export function PayInstallmentSheet({
  installment,
  submitting,
  error,
  onClose,
  onSubmit,
}: PayInstallmentSheetProps) {
  const { colors } = useTheme();
  const [dateDisplay, setDateDisplay] = useState("");
  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<PayInstallmentInput>({
    resolver: zodResolver(payInstallmentInputSchema),
    defaultValues: { paymentDate: "", paidAmount: undefined },
  });

  // Re-seeds the defaults every time the sheet opens for an installment.
  useEffect(() => {
    if (!installment) return;
    const today = localTodayISO();
    setDateDisplay(formatDateDisplay(today));
    reset({ paymentDate: today, paidAmount: Number(installment.amount) });
  }, [installment, reset]);

  return (
    <PaperSheet
      testID="pay-installment-sheet"
      visible={installment !== null}
      title={installment ? `Pagar parcela ${installment.installmentNo}` : ""}
      onClose={onClose}
    >
      {installment ? (
        <View style={[styles.summary, { backgroundColor: colors.surfaceMuted }]}>
          <IconBadge icon="calendar" size={40} filled />
          <View style={styles.flex}>
            <Text variant="footnote" tone="muted">
              Vencimento
            </Text>
            <Text variant="bodyStrong">{formatDateDisplay(installment.dueDate)}</Text>
          </View>
          <View style={styles.amount}>
            <Text variant="footnote" tone="muted">
              Parcela
            </Text>
            <Text variant="numeral">{formatMoney(installment.amount)}</Text>
          </View>
        </View>
      ) : null}

      <Controller
        control={control}
        name="paidAmount"
        render={({ field }) => (
          <AmountField
            testID="paid-amount-input"
            size="compact"
            label="Valor pago"
            value={field.value}
            onChangeValue={field.onChange}
            error={errors.paidAmount?.message}
          />
        )}
      />

      <Controller
        control={control}
        name="paymentDate"
        render={({ field }) => (
          <TextField
            testID="payment-date-input"
            label="Data do pagamento"
            leftIcon="calendar-outline"
            value={dateDisplay}
            onChangeText={(text) => {
              setDateDisplay(formatDateInputDigits(text));
              field.onChange(parseDateInputToISO(text));
            }}
            keyboardType="number-pad"
            placeholder="DD/MM/AAAA"
            maxLength={10}
            error={errors.paymentDate?.message}
          />
        )}
      />

      {error ? <InlineNotice tone="danger" message={error} /> : null}

      <Button
        testID="confirm-payment-button"
        label="Registrar pagamento"
        leftIcon="checkmark-circle"
        onPress={handleSubmit(onSubmit)}
        loading={submitting}
      />
    </PaperSheet>
  );
}

const styles = StyleSheet.create({
  summary: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
    padding: space.md,
    borderRadius: radius.lg,
  },
  flex: {
    flex: 1,
  },
  amount: {
    alignItems: "flex-end",
  },
});
