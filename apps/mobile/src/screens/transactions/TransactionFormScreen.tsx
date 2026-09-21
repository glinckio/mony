import { Ionicons } from "@expo/vector-icons";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  createTransactionInputSchema,
  type Category,
  type CreateTransactionInput,
  type TransactionStatus,
  type TransactionType,
} from "@mony/shared-types";
import { color, radius, size as sizeTokens, spacing } from "@mony/ui-tokens";
import { useNavigation, useRoute, type RouteProp } from "@react-navigation/native";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { StyleSheet, TouchableOpacity, View } from "react-native";

import { Button, Screen, SegmentedToggle, Text, TextField } from "../../components/ui";
import { apiFetch } from "../../lib/api-client";
import { formatAmountDisplay, parseAmountInput } from "../../lib/currency-mask";
import { formatDateDisplay, formatDateInputDigits, parseDateInputToISO } from "../../lib/date-mask";
import type { AppStackNavigation, AppStackParamList } from "../../navigation/RootNavigator";

const TYPE_OPTIONS: Array<{ value: TransactionType; label: string }> = [
  { value: "EXPENSE", label: "Despesa" },
  { value: "INCOME", label: "Receita" },
];

const STATUS_OPTIONS: Array<{ value: TransactionStatus; label: string }> = [
  { value: "PENDING", label: "Pendente" },
  { value: "PAID", label: "Pago" },
];

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
      navigation.goBack();
    } catch {
      setSubmitError("Algo deu errado. Tente novamente.");
    }
  };

  return (
    <Screen>
      <View style={styles.header}>
        <Text variant="heading">{editing ? "Editar transação" : "Nova transação"}</Text>
        <TouchableOpacity
          testID="header-close"
          accessibilityRole="button"
          hitSlop={8}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="close-outline" size={sizeTokens.iconLg} color={color.textPrimary} />
        </TouchableOpacity>
      </View>

      <View style={styles.form}>
        <View>
          <Text variant="caption" style={styles.fieldLabel}>
            Tipo
          </Text>
          <SegmentedToggle
            testID="type-option"
            options={TYPE_OPTIONS}
            value={type}
            disabled={!!editing}
            onChange={(value) => {
              setValue("type", value, { shouldValidate: true });
              setValue("categoryId", "", { shouldValidate: false });
            }}
          />
        </View>

        {type === "EXPENSE" && (
          <View>
            <Text variant="caption" style={styles.fieldLabel}>
              Status
            </Text>
            <SegmentedToggle
              testID="status-option"
              options={STATUS_OPTIONS}
              value={status ?? "PENDING"}
              onChange={(value) => setValue("status", value, { shouldValidate: true })}
            />
          </View>
        )}

        <View>
          <Text variant="caption" style={styles.fieldLabel}>
            Categoria
          </Text>
          <View style={styles.categoryList} testID="category-picker">
            {(categories ?? []).map((category) => {
              const selected = category.id === categoryId;
              return (
                <TouchableOpacity
                  key={category.id}
                  testID={`category-option-${category.id}`}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  style={[styles.categoryChip, selected && styles.categoryChipSelected]}
                  onPress={() => setValue("categoryId", category.id, { shouldValidate: true })}
                >
                  <Ionicons
                    name={category.icon as never}
                    size={sizeTokens.iconSm}
                    color={selected ? color.onPrimary : category.color}
                  />
                  <Text variant="caption" color={selected ? color.onPrimary : color.textPrimary}>
                    {category.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
          {errors.categoryId?.message && (
            <Text variant="caption" color={color.danger} style={styles.fieldError}>
              {errors.categoryId.message}
            </Text>
          )}
        </View>

        <Controller
          control={control}
          name="description"
          render={({ field }) => (
            <TextField
              testID="description-input"
              label="Descrição"
              value={field.value}
              onChangeText={field.onChange}
              error={errors.description?.message}
            />
          )}
        />

        <Controller
          control={control}
          name="amount"
          render={({ field }) => (
            <TextField
              testID="amount-input"
              label="Valor"
              value={formatAmountDisplay(field.value)}
              onChangeText={(text) => field.onChange(parseAmountInput(text))}
              keyboardType="number-pad"
              placeholder="R$ 0,00"
              error={errors.amount?.message}
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
              value={dateDisplay}
              onChangeText={(text) => {
                setDateDisplay(formatDateInputDigits(text));
                field.onChange(parseDateInputToISO(text));
              }}
              keyboardType="number-pad"
              placeholder="DD/MM/AAAA"
              error={errors.date?.message}
            />
          )}
        />

        {!editing && (
          <>
            <TouchableOpacity
              testID="recurring-toggle"
              accessibilityRole="button"
              accessibilityState={{ selected: !!recurring }}
              style={styles.recurringRow}
              onPress={() => setValue("recurring", !recurring, { shouldValidate: true })}
            >
              <Ionicons
                name={recurring ? "checkbox" : "square-outline"}
                size={sizeTokens.iconMd}
                color={color.primary}
              />
              <Text variant="body">Repetir todo mês</Text>
            </TouchableOpacity>

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
                    error={errors.recurringMonths?.message}
                  />
                )}
              />
            )}
          </>
        )}
      </View>

      {submitError && (
        <View style={styles.submitError}>
          <Ionicons name="alert-circle-outline" size={sizeTokens.iconSm} color={color.danger} />
          <Text variant="caption" color={color.danger}>
            {submitError}
          </Text>
        </View>
      )}

      <Button
        testID="submit-button"
        label={editing ? "Salvar alterações" : "Criar transação"}
        onPress={handleSubmit(onSubmit)}
        loading={isSubmitting}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  form: {
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  fieldLabel: {
    marginBottom: spacing.xs,
    marginLeft: spacing.xxs,
  },
  fieldError: {
    marginTop: spacing.xs,
    marginLeft: spacing.xxs,
  },
  categoryList: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  categoryChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    backgroundColor: color.surfaceAlt,
    borderRadius: radius.sm,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  categoryChipSelected: {
    backgroundColor: color.primary,
  },
  recurringRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  submitError: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    backgroundColor: color.dangerMuted,
    borderRadius: radius.sm,
    padding: spacing.sm,
    marginBottom: spacing.md,
  },
});
