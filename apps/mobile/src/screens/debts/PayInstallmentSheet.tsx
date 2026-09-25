import { Ionicons } from "@expo/vector-icons";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  formatCurrency,
  payInstallmentInputSchema,
  type DebtInstallment,
  type PayInstallmentInput,
} from "@mony/shared-types";
import { color, radius, size as sizeTokens, spacing } from "@mony/ui-tokens";
import { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { StyleSheet, View } from "react-native";

import { BottomSheet, Button, Text, TextField } from "../../components/ui";
import { formatAmountDisplay, parseAmountInput } from "../../lib/currency-mask";
import {
  formatDateDisplay,
  formatDateInputDigits,
  localTodayISO,
  parseDateInputToISO,
} from "../../lib/date-mask";

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
    <BottomSheet
      testID="pay-installment-sheet"
      visible={installment !== null}
      title={installment ? `Pagar parcela ${installment.installmentNo}` : ""}
      onClose={onClose}
    >
      {installment && (
        <Text variant="caption">
          Vencimento {formatDateDisplay(installment.dueDate)} · {formatCurrency(installment.amount)}
        </Text>
      )}

      <Controller
        control={control}
        name="paymentDate"
        render={({ field }) => (
          <TextField
            testID="payment-date-input"
            label="Data do pagamento"
            value={dateDisplay}
            onChangeText={(text) => {
              setDateDisplay(formatDateInputDigits(text));
              field.onChange(parseDateInputToISO(text));
            }}
            keyboardType="number-pad"
            placeholder="DD/MM/AAAA"
            error={errors.paymentDate?.message}
          />
        )}
      />

      <Controller
        control={control}
        name="paidAmount"
        render={({ field }) => (
          <TextField
            testID="paid-amount-input"
            label="Valor pago"
            value={formatAmountDisplay(field.value)}
            onChangeText={(text) => field.onChange(parseAmountInput(text))}
            keyboardType="number-pad"
            placeholder="R$ 0,00"
            error={errors.paidAmount?.message}
          />
        )}
      />

      {error && (
        <View style={styles.submitError}>
          <Ionicons name="alert-circle-outline" size={sizeTokens.iconSm} color={color.danger} />
          <Text variant="caption" color={color.danger}>
            {error}
          </Text>
        </View>
      )}

      <Button
        testID="confirm-payment-button"
        label="Registrar pagamento"
        onPress={handleSubmit(onSubmit)}
        loading={submitting}
      />
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  submitError: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    backgroundColor: color.dangerMuted,
    borderRadius: radius.sm,
    padding: spacing.sm,
  },
});
