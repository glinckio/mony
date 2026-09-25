import { Ionicons } from "@expo/vector-icons";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  setGroceryBudgetInputSchema,
  type GroceryBudget,
  type SetGroceryBudgetInput,
} from "@mony/shared-types";
import { color, radius, size as sizeTokens, spacing } from "@mony/ui-tokens";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
import { StyleSheet, View } from "react-native";

import { BottomSheet, Button, Text, TextField } from "../../components/ui";
import { apiFetch } from "../../lib/api-client";
import { formatAmountDisplay, parseAmountInput } from "../../lib/currency-mask";

interface GroceryBudgetSheetProps {
  visible: boolean;
  currentAmount: string | null;
  onClose: () => void;
}

// Setting the budget always records a new entry server-side (legacy
// audit trail) — from here it just looks like editing one value.
export function GroceryBudgetSheet({ visible, currentAmount, onClose }: GroceryBudgetSheetProps) {
  const queryClient = useQueryClient();
  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<SetGroceryBudgetInput>({
    resolver: zodResolver(setGroceryBudgetInputSchema),
    defaultValues: { amount: undefined },
  });

  const mutation = useMutation({
    mutationFn: (input: SetGroceryBudgetInput) =>
      apiFetch<GroceryBudget>("/grocery/budget", { method: "POST", body: JSON.stringify(input) }),
    onSuccess: async (budget) => {
      queryClient.setQueryData(["grocery", "budget"], budget);
      onClose();
    },
  });
  const { reset: resetMutation } = mutation;

  // Re-seed the field and clear any previous error every time it opens.
  useEffect(() => {
    if (!visible) return;
    resetMutation();
    reset({ amount: currentAmount === null ? undefined : Number(currentAmount) });
  }, [visible, currentAmount, reset, resetMutation]);

  return (
    <BottomSheet
      testID="grocery-budget-sheet"
      visible={visible}
      title="Orçamento mensal"
      onClose={onClose}
    >
      <Text variant="caption">
        Apenas informativo — o app avisa quando a estimativa passa do orçamento, mas nunca bloqueia.
      </Text>
      <Controller
        control={control}
        name="amount"
        render={({ field }) => (
          <TextField
            testID="grocery-budget-input"
            label="Valor"
            value={formatAmountDisplay(field.value)}
            onChangeText={(text) => field.onChange(parseAmountInput(text) ?? 0)}
            keyboardType="number-pad"
            placeholder="R$ 0,00"
            error={errors.amount?.message}
          />
        )}
      />
      {mutation.isError && (
        <View style={styles.submitError}>
          <Ionicons name="alert-circle-outline" size={sizeTokens.iconSm} color={color.danger} />
          <Text variant="caption" color={color.danger}>
            Não foi possível salvar o orçamento. Tente novamente.
          </Text>
        </View>
      )}
      <Button
        testID="save-grocery-budget"
        label="Salvar orçamento"
        loading={mutation.isPending}
        onPress={handleSubmit((input) => mutation.mutate(input))}
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
