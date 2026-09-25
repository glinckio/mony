import { Ionicons } from "@expo/vector-icons";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  createDebtInputSchema,
  formatCurrency,
  type Category,
  type CreateDebtInput,
  type DebtWithInstallments,
  type UpdateDebtInput,
} from "@mony/shared-types";
import { color, radius, size as sizeTokens, spacing } from "@mony/ui-tokens";
import { useNavigation, useRoute, type RouteProp } from "@react-navigation/native";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { StyleSheet, TouchableOpacity, View } from "react-native";

import { Button, Screen, Text, TextField } from "../../components/ui";
import { ApiError, apiFetch } from "../../lib/api-client";
import { formatAmountDisplay, parseAmountInput } from "../../lib/currency-mask";
import { formatDateDisplay, formatDateInputDigits, parseDateInputToISO } from "../../lib/date-mask";
import { DEBT_RELATED_QUERY_KEYS } from "../../lib/debt-display";
import { useRefetchOnFocus } from "../../lib/use-refetch-on-focus";
import type { AppStackNavigation, AppStackParamList } from "../../navigation/RootNavigator";

// "1,99" -> 1.99; "" -> undefined. Keeps at most one comma and two
// decimals so the display can't drift from what gets submitted.
function sanitizeRateInput(text: string): string {
  const [integer = "", ...decimals] = text.replace(/[^\d,]/g, "").split(",");
  return decimals.length > 0 ? `${integer},${decimals.join("").slice(0, 2)}` : integer;
}

function parseRateInput(text: string): number | undefined {
  if (!text) return undefined;
  const value = Number(text.replace(",", "."));
  return Number.isNaN(value) ? undefined : value;
}

export function DebtFormScreen() {
  const navigation = useNavigation<AppStackNavigation>();
  const queryClient = useQueryClient();
  const route = useRoute<RouteProp<AppStackParamList, "DebtForm">>();
  const editing = route.params?.debt;
  // Installments are regenerated when the count/start date change, which
  // the API refuses once any installment is paid — so lock those fields
  // up front instead of letting the user hit a 400 on submit.
  const structureLocked = (editing?.paidInstallments ?? 0) > 0;
  const [submitError, setSubmitError] = useState<string | null>(null);
  // Masked display values kept apart from the ISO/number values RHF/zod
  // validate — a partially typed date ("15/0") has no ISO form yet.
  const [startDateDisplay, setStartDateDisplay] = useState(
    editing ? formatDateDisplay(editing.startDate) : "",
  );
  const [endDateDisplay, setEndDateDisplay] = useState(
    editing?.endDate ? formatDateDisplay(editing.endDate) : "",
  );
  const [rateDisplay, setRateDisplay] = useState(editing?.interestRate?.replace(".", ",") ?? "");

  const {
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<CreateDebtInput>({
    resolver: zodResolver(createDebtInputSchema),
    defaultValues: {
      name: editing?.name ?? "",
      totalAmount: editing ? Number(editing.totalAmount) : undefined,
      totalInstallments: editing?.totalInstallments,
      startDate: editing?.startDate ?? "",
      endDate: editing?.endDate ?? undefined,
      interestRate: editing?.interestRate ? Number(editing.interestRate) : undefined,
      categoryId: editing?.categoryId ?? undefined,
      notes: editing?.notes ?? undefined,
    },
  });

  const categoryId = watch("categoryId");
  const totalAmount = watch("totalAmount");
  const totalInstallments = watch("totalInstallments");

  const { data: categories, refetch: refetchCategories } = useQuery({
    queryKey: ["categories", "EXPENSE"],
    queryFn: () => apiFetch<Category[]>("/categories?type=EXPENSE"),
  });
  // Coming back from the "create category" shortcut below.
  useRefetchOnFocus(refetchCategories);
  const noExpenseCategory = categories !== undefined && categories.length === 0;

  // Display-only mirror of the API's split (floor to the cent, last
  // installment absorbs the remainder). Hidden below one cent — the
  // form's own validation message covers that case on submit.
  const previewCents =
    totalAmount && totalInstallments && totalInstallments > 0
      ? Math.floor(Math.round(totalAmount * 100) / totalInstallments)
      : 0;
  const installmentPreview = previewCents >= 1 ? previewCents / 100 : null;

  const onSubmit = async (data: CreateDebtInput) => {
    setSubmitError(null);
    try {
      if (editing) {
        const body: UpdateDebtInput = {
          name: data.name,
          totalAmount: data.totalAmount,
          ...(structureLocked
            ? {}
            : { totalInstallments: data.totalInstallments, startDate: data.startDate }),
          endDate: data.endDate || null,
          interestRate: data.interestRate ?? null,
          categoryId: data.categoryId ?? null,
          notes: data.notes || null,
        };
        const updated = await apiFetch<DebtWithInstallments>(`/debts/${editing.id}`, {
          method: "PATCH",
          body: JSON.stringify(body),
        });
        // The PATCH response is the same full debt GET /debts/:id returns —
        // seed the detail screen underneath with it rather than refetching
        // every installment (up to 420) right after the save.
        queryClient.setQueryData(["debt", editing.id], updated);
      } else {
        await apiFetch<DebtWithInstallments>("/debts", {
          method: "POST",
          body: JSON.stringify({
            ...data,
            endDate: data.endDate || undefined,
            notes: data.notes || undefined,
          }),
        });
      }
      // No other debt's detail changes when one debt is created/edited, so
      // the per-debt ["debt", id] caches are left alone (see above).
      await Promise.all(
        DEBT_RELATED_QUERY_KEYS.filter((key) => key[0] !== "debt").map((queryKey) =>
          queryClient.invalidateQueries({ queryKey }),
        ),
      );
      navigation.goBack();
    } catch (error) {
      setSubmitError(
        error instanceof ApiError && error.statusCode === 400
          ? "Não foi possível salvar. Verifique os dados e tente novamente."
          : "Algo deu errado. Tente novamente.",
      );
    }
  };

  return (
    <Screen>
      <View style={styles.header}>
        <Text variant="heading">{editing ? "Editar dívida" : "Nova dívida"}</Text>
        <TouchableOpacity
          testID="header-close"
          accessibilityRole="button"
          accessibilityLabel="Fechar"
          hitSlop={8}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="close-outline" size={sizeTokens.iconLg} color={color.textPrimary} />
        </TouchableOpacity>
      </View>

      {noExpenseCategory && (
        <View style={styles.warningBanner} testID="no-expense-category-banner">
          <Text variant="caption" color={color.textPrimary}>
            Cada parcela vira uma despesa, então você precisa de pelo menos uma categoria de despesa
            para registrar uma dívida.
          </Text>
          <Button
            testID="create-category-shortcut"
            label="Criar categoria"
            variant="secondary"
            onPress={() => navigation.navigate("CategoryForm", undefined)}
          />
        </View>
      )}

      <View style={styles.form}>
        <Controller
          control={control}
          name="name"
          render={({ field }) => (
            <TextField
              testID="name-input"
              label="Nome"
              value={field.value}
              onChangeText={field.onChange}
              placeholder="Ex.: Financiamento do carro"
              error={errors.name?.message}
            />
          )}
        />

        <Controller
          control={control}
          name="totalAmount"
          render={({ field }) => (
            <TextField
              testID="total-amount-input"
              label="Valor total"
              value={formatAmountDisplay(field.value)}
              onChangeText={(text) => field.onChange(parseAmountInput(text))}
              keyboardType="number-pad"
              placeholder="R$ 0,00"
              error={errors.totalAmount?.message}
            />
          )}
        />

        <Controller
          control={control}
          name="totalInstallments"
          render={({ field }) => (
            <TextField
              testID="total-installments-input"
              label="Número de parcelas"
              value={field.value !== undefined ? String(field.value) : ""}
              onChangeText={(text) => {
                const digits = text.replace(/\D/g, "");
                field.onChange(digits ? Number(digits) : undefined);
              }}
              keyboardType="number-pad"
              placeholder="12"
              editable={!structureLocked}
              error={errors.totalInstallments?.message}
            />
          )}
        />
        {installmentPreview !== null && (
          <Text variant="caption" testID="installment-preview">
            {totalInstallments}x de {formatCurrency(installmentPreview.toFixed(2))} (a última
            parcela ajusta os centavos)
          </Text>
        )}

        <Controller
          control={control}
          name="startDate"
          render={({ field }) => (
            <TextField
              testID="start-date-input"
              label="Vencimento da 1ª parcela"
              value={startDateDisplay}
              onChangeText={(text) => {
                setStartDateDisplay(formatDateInputDigits(text));
                field.onChange(parseDateInputToISO(text));
              }}
              keyboardType="number-pad"
              placeholder="DD/MM/AAAA"
              editable={!structureLocked}
              error={errors.startDate?.message}
            />
          )}
        />
        {structureLocked && (
          <Text variant="caption" testID="structure-locked-hint">
            Como já há parcelas pagas, o número de parcelas e o vencimento da 1ª não podem mais ser
            alterados.
          </Text>
        )}

        <Controller
          control={control}
          name="endDate"
          render={({ field }) => (
            <TextField
              testID="end-date-input"
              label="Data final (opcional)"
              value={endDateDisplay}
              onChangeText={(text) => {
                setEndDateDisplay(formatDateInputDigits(text));
                field.onChange(parseDateInputToISO(text) || undefined);
              }}
              keyboardType="number-pad"
              placeholder="DD/MM/AAAA"
              error={errors.endDate?.message}
            />
          )}
        />

        <Controller
          control={control}
          name="interestRate"
          render={({ field }) => (
            <TextField
              testID="interest-rate-input"
              label="Juros ao mês em % (opcional)"
              value={rateDisplay}
              onChangeText={(text) => {
                const sanitized = sanitizeRateInput(text);
                setRateDisplay(sanitized);
                field.onChange(parseRateInput(sanitized));
              }}
              keyboardType="decimal-pad"
              placeholder="0,00"
              error={errors.interestRate?.message}
            />
          )}
        />
        <Text variant="caption">
          Apenas informativo — as parcelas são sempre divididas em valores iguais.
        </Text>

        <View>
          <Text variant="caption" style={styles.fieldLabel}>
            Categoria
          </Text>
          <View style={styles.categoryList} testID="category-picker">
            <TouchableOpacity
              testID="category-option-none"
              accessibilityRole="button"
              accessibilityState={{ selected: !categoryId }}
              style={[styles.categoryChip, !categoryId && styles.categoryChipSelected]}
              onPress={() => setValue("categoryId", undefined, { shouldValidate: true })}
            >
              <Text variant="caption" color={!categoryId ? color.onPrimary : color.textPrimary}>
                Automática
              </Text>
            </TouchableOpacity>
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
                    name={category.icon}
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
          {!categoryId && (
            <Text variant="caption" style={styles.categoryHint}>
              Automática: as despesas das parcelas usam sua categoria de despesa mais antiga.
            </Text>
          )}
        </View>

        <Controller
          control={control}
          name="notes"
          render={({ field }) => (
            <TextField
              testID="notes-input"
              label="Observações (opcional)"
              value={field.value ?? ""}
              onChangeText={field.onChange}
              multiline
              error={errors.notes?.message}
            />
          )}
        />
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
        label={editing ? "Salvar alterações" : "Criar dívida"}
        onPress={handleSubmit(onSubmit)}
        loading={isSubmitting}
        disabled={noExpenseCategory}
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
  warningBanner: {
    gap: spacing.sm,
    backgroundColor: color.warningMuted,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  form: {
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  fieldLabel: {
    marginBottom: spacing.xs,
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
  categoryHint: {
    marginTop: spacing.xs,
    marginLeft: spacing.xxs,
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
