import { zodResolver } from "@hookform/resolvers/zod";
import {
  createTransactionInputSchema,
  type Category,
  type CreateTransactionInput,
  type TransactionStatus,
  type TransactionType,
} from "@mony/shared-types";
import { useNavigation, useRoute, type RouteProp } from "@react-navigation/native";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { StyleSheet, View } from "react-native";

import { AmountField } from "../../components/domain";
import {
  Button,
  Checkbox,
  Field,
  FormScreen,
  InlineNotice,
  SegmentedControl,
  SelectChip,
  TextField,
  type IconName,
} from "../../components/ui";
import { apiFetch } from "../../lib/api-client";
import { formatDateDisplay, formatDateInputDigits, parseDateInputToISO } from "../../lib/date-mask";
import { formatMoney } from "../../lib/money-display";
import { useToastStore } from "../../lib/toast-store";
import type { AppStackNavigation, AppStackParamList } from "../../navigation/RootNavigator";
import { space } from "../../theme";
import { haptic } from "../../theme/haptics";

const TYPE_OPTIONS: Array<{ value: TransactionType; label: string }> = [
  { value: "EXPENSE", label: "Despesa" },
  { value: "INCOME", label: "Receita" },
];

const STATUS_OPTIONS: Array<{ value: TransactionStatus; label: string }> = [
  { value: "PENDING", label: "A pagar" },
  { value: "PAID", label: "Pago" },
];

// Lançamento (design/telas.md §3): the amount first, as the hero, then
// what and when. The CTA stays glued above the keyboard.
export function TransactionFormScreen() {
  const navigation = useNavigation<AppStackNavigation>();
  const queryClient = useQueryClient();
  const route = useRoute<RouteProp<AppStackParamList, "TransactionForm">>();
  const editing = route.params?.transaction;
  const [submitError, setSubmitError] = useState<string | null>(null);
  // Kept separately from the ISO value RHF/zod validate, since a
  // partially-typed date (e.g. "15/0") has no valid ISO representation
  // yet but still needs something to display in the field.
  const [dateDisplay, setDateDisplay] = useState(
    editing?.date ? formatDateDisplay(editing.date) : "",
  );

  const {
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<CreateTransactionInput>({
    resolver: zodResolver(createTransactionInputSchema),
    defaultValues: {
      categoryId: editing?.categoryId ?? "",
      type: editing?.type ?? "EXPENSE",
      status: editing?.status,
      description: editing?.description ?? "",
      amount: editing ? Number(editing.amount) : undefined,
      date: editing?.date ?? "",
      recurring: false,
    },
  });

  const type = watch("type");
  const status = watch("status");
  const categoryId = watch("categoryId");
  const recurring = watch("recurring");

  const { data: categories } = useQuery({
    queryKey: ["categories", type],
    queryFn: () => apiFetch<Category[]>(`/categories?type=${type}`),
  });

  const onSubmit = async (data: CreateTransactionInput) => {
    setSubmitError(null);
    try {
      if (editing) {
        await apiFetch(`/transactions/${editing.id}`, {
          method: "PATCH",
          body: JSON.stringify({
            categoryId: data.categoryId,
            description: data.description,
            amount: data.amount,
            date: data.date,
          }),
        });
      } else {
        await apiFetch("/transactions", { method: "POST", body: JSON.stringify(data) });
      }
      await queryClient.invalidateQueries({ queryKey: ["transactions"] });
      void queryClient.invalidateQueries({ queryKey: ["reports"] });
      const category = categories?.find((item) => item.id === data.categoryId);
      haptic.success();
      useToastStore.getState().show(editing ? "Alterações salvas." : "Lançamento registrado.", {
        tone: "success",
        receipt: {
          amount: `${data.type === "INCOME" ? "+" : "−"} ${formatMoney(data.amount)}`,
          detail: category?.name,
        },
      });
      navigation.goBack();
    } catch {
      haptic.error();
      setSubmitError("Algo deu errado. Tente novamente.");
    }
  };

  const income = type === "INCOME";

  return (
    <FormScreen
      title={editing ? "Editar lançamento" : "Novo lançamento"}
      onClose={() => navigation.goBack()}
      footer={
        <>
          {submitError ? <InlineNotice tone="danger" message={submitError} /> : null}
          <Button
            testID="submit-button"
            label={editing ? "Salvar alterações" : income ? "Salvar receita" : "Salvar despesa"}
            onPress={handleSubmit(onSubmit)}
            loading={isSubmitting}
          />
        </>
      }
    >
      <SegmentedControl
        testID="type-option"
        accessibilityLabel="Tipo"
        options={TYPE_OPTIONS}
        value={type}
        disabled={!!editing}
        onChange={(value) => {
          setValue("type", value, { shouldValidate: true });
          setValue("categoryId", "", { shouldValidate: false });
        }}
      />

      <Controller
        control={control}
        name="amount"
        render={({ field }) => (
          <AmountField
            testID="amount-input"
            label={income ? "Valor da receita" : "Valor da despesa"}
            direction={income ? "in" : "out"}
            value={field.value}
            onChangeValue={field.onChange}
            autoFocus={!editing}
            error={errors.amount?.message}
          />
        )}
      />

      {!income && (
        <Field label="Situação">
          <SegmentedControl
            testID="status-option"
            accessibilityLabel="Situação"
            options={STATUS_OPTIONS}
            value={status ?? "PENDING"}
            onChange={(value) => setValue("status", value, { shouldValidate: true })}
          />
        </Field>
      )}

      <Field label="Categoria" error={errors.categoryId?.message}>
        <View style={styles.chips} testID="category-picker" accessibilityRole="radiogroup">
          {(categories ?? []).map((category) => (
            <SelectChip
              key={category.id}
              testID={`category-option-${category.id}`}
              label={category.name}
              icon={category.icon as IconName}
              iconColor={category.color}
              selected={category.id === categoryId}
              onPress={() => setValue("categoryId", category.id, { shouldValidate: true })}
            />
          ))}
          {categories && categories.length === 0 ? (
            <SelectChip
              label="Criar categoria"
              icon="add"
              dashed
              selected={false}
              onPress={() => navigation.navigate("CategoryForm", { type })}
            />
          ) : null}
        </View>
      </Field>

      <Controller
        control={control}
        name="description"
        render={({ field }) => (
          <TextField
            testID="description-input"
            label="Descrição"
            placeholder={income ? "Ex.: Salário" : "Ex.: Mercado do mês"}
            value={field.value}
            onChangeText={field.onChange}
            returnKeyType="next"
            error={errors.description?.message}
          />
        )}
      />

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

      {!editing && (
        <View style={styles.recurring}>
          <Checkbox
            testID="recurring-toggle"
            label="Repetir todo mês"
            description="Cria um lançamento por mês, a partir desta data."
            checked={!!recurring}
            onChange={(next) => setValue("recurring", next, { shouldValidate: true })}
          />
          {recurring && (
            <Controller
              control={control}
              name="recurringMonths"
              render={({ field }) => (
                <TextField
                  testID="recurring-months-input"
                  label="Por quantos meses (1-60)"
                  value={field.value === undefined ? "" : String(field.value)}
                  onChangeText={(text) => field.onChange(text ? Number(text) : undefined)}
                  keyboardType="number-pad"
                  maxLength={2}
                  error={errors.recurringMonths?.message}
                />
              )}
            />
          )}
        </View>
      )}
    </FormScreen>
  );
}

const styles = StyleSheet.create({
  chips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: space.sm,
  },
  recurring: {
    gap: space.md,
  },
});
