import { zodResolver } from "@hookform/resolvers/zod";
import {
  setGroceryBudgetInputSchema,
  type GroceryBudget,
  type SetGroceryBudgetInput,
} from "@mony/shared-types";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";

import { AmountField } from "../../components/domain";
import { Button, InlineNotice, PaperSheet, Text } from "../../components/ui";
import { apiFetch } from "../../lib/api-client";
import { haptic } from "../../theme/haptics";

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
      haptic.success();
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
    <PaperSheet
      testID="grocery-budget-sheet"
      visible={visible}
      title="Orçamento mensal"
      onClose={onClose}
    >
      <Text variant="callout" tone="muted">
        Apenas informativo — o app avisa quando a estimativa passa do orçamento, mas nunca bloqueia.
      </Text>
      <Controller
        control={control}
        name="amount"
        render={({ field }) => (
          <AmountField
            testID="grocery-budget-input"
            size="compact"
            label="Valor do orçamento"
            value={field.value}
            onChangeValue={(value) => field.onChange(value ?? 0)}
            error={errors.amount?.message}
          />
        )}
      />
      {mutation.isError ? (
        <InlineNotice
          tone="danger"
          message="Não foi possível salvar o orçamento. Tente novamente."
        />
      ) : null}
      <Button
        testID="save-grocery-budget"
        label="Salvar orçamento"
        loading={mutation.isPending}
        onPress={handleSubmit((input) => mutation.mutate(input))}
      />
    </PaperSheet>
  );
}
