import { zodResolver } from "@hookform/resolvers/zod";
import {
  createDebtInputSchema,
  formatCurrency,
  type Category,
  type CreateDebtInput,
  type DebtWithInstallments,
  type UpdateDebtInput,
} from "@mony/shared-types";
import { useNavigation, useRoute, type RouteProp } from "@react-navigation/native";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { StyleSheet, View } from "react-native";

import { AmountField } from "../../components/domain";
import {
  Button,
  Card,
  Field,
  FormScreen,
  IconBadge,
  InlineNotice,
  SelectChip,
  Text,
  TextField,
  type IconName,
} from "../../components/ui";
import { ApiError, apiFetch } from "../../lib/api-client";
import { formatDateDisplay, formatDateInputDigits, parseDateInputToISO } from "../../lib/date-mask";
import { DEBT_RELATED_QUERY_KEYS } from "../../lib/debt-display";
import {
  formatDecimalInput,
  parseDecimalInput,
  sanitizeDecimalInput,
} from "../../lib/decimal-input";
import { useToastStore } from "../../lib/toast-store";
import { useRefetchOnFocus } from "../../lib/use-refetch-on-focus";
import type { AppStackNavigation, AppStackParamList } from "../../navigation/RootNavigator";
import { space } from "../../theme";
import { haptic } from "../../theme/haptics";

// Dívida (form) (design/telas.md §11): total as the hero, the split into
// installments previewed live, then dates, interest and category.
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
  const [rateDisplay, setRateDisplay] = useState(formatDecimalInput(editing?.interestRate));

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
      haptic.success();
      useToastStore
        .getState()
        .show(editing ? "Dívida atualizada." : "Dívida registrada.", { tone: "success" });
      navigation.goBack();
    } catch (error) {
      haptic.error();
      setSubmitError(
        error instanceof ApiError && error.statusCode === 400
          ? "Não foi possível salvar. Verifique os dados e tente novamente."
          : "Algo deu errado. Tente novamente.",
      );
    }
  };

  return (
    <FormScreen
      title={editing ? "Editar dívida" : "Nova dívida"}
      onClose={() => navigation.goBack()}
      footer={
        <>
          {submitError ? <InlineNotice tone="danger" message={submitError} /> : null}
          <Button
            testID="submit-button"
            label={editing ? "Salvar alterações" : "Criar dívida"}
            onPress={handleSubmit(onSubmit)}
            loading={isSubmitting}
            disabled={noExpenseCategory}
          />
        </>
      }
    >
      {noExpenseCategory ? (
        <InlineNotice
          testID="no-expense-category-banner"
          tone="warning"
          title="Falta uma categoria de despesa"
          message="Cada parcela vira uma despesa, então você precisa de pelo menos uma categoria de despesa para registrar uma dívida."
          action={{
            label: "Criar categoria",
            testID: "create-category-shortcut",
            onPress: () => navigation.navigate("CategoryForm", undefined),
          }}
        />
      ) : null}

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
          <AmountField
            testID="total-amount-input"
            label="Valor total"
            value={field.value}
            onChangeValue={field.onChange}
            error={errors.totalAmount?.message}
          />
        )}
      />

      <Card style={styles.split}>
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
        {installmentPreview !== null ? (
          <View style={styles.preview}>
            <IconBadge icon="layers-outline" size={36} />
            <Text variant="callout" style={styles.flex} testID="installment-preview">
              {totalInstallments}x de {formatCurrency(installmentPreview.toFixed(2))}{" "}
              <Text variant="footnote" tone="muted" inline>
                (a última parcela ajusta os centavos)
              </Text>
            </Text>
          </View>
        ) : null}
        <Controller
          control={control}
          name="startDate"
          render={({ field }) => (
            <TextField
              testID="start-date-input"
              label="Vencimento da 1ª parcela"
              leftIcon="calendar-outline"
              value={startDateDisplay}
              onChangeText={(text) => {
                setStartDateDisplay(formatDateInputDigits(text));
                field.onChange(parseDateInputToISO(text));
              }}
              keyboardType="number-pad"
              placeholder="DD/MM/AAAA"
              maxLength={10}
              editable={!structureLocked}
              error={errors.startDate?.message}
            />
          )}
        />
        {structureLocked ? (
          <InlineNotice
            testID="structure-locked-hint"
            tone="neutral"
            message="Como já há parcelas pagas, o número de parcelas e o vencimento da 1ª não podem mais ser alterados."
          />
        ) : null}
      </Card>

      <Controller
        control={control}
        name="endDate"
        render={({ field }) => (
          <TextField
            testID="end-date-input"
            label="Data final (opcional)"
            leftIcon="calendar-outline"
            value={endDateDisplay}
            onChangeText={(text) => {
              setEndDateDisplay(formatDateInputDigits(text));
              // Empty clears it; a half-typed date is kept as-is so the
              // schema flags it ("Data inválida") instead of silently
              // dropping — and, on edit, clearing — the stored date.
              field.onChange(text ? parseDateInputToISO(text) || text : undefined);
            }}
            keyboardType="number-pad"
            placeholder="DD/MM/AAAA"
            maxLength={10}
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
              const sanitized = sanitizeDecimalInput(text);
              setRateDisplay(sanitized);
              field.onChange(parseDecimalInput(sanitized));
            }}
            keyboardType="decimal-pad"
            placeholder="0,00"
            hint="Apenas informativo — as parcelas são sempre divididas em valores iguais."
            error={errors.interestRate?.message}
          />
        )}
      />

      <Field
        label="Categoria"
        hint={
          !categoryId
            ? "Automática: as despesas das parcelas usam sua categoria de despesa mais antiga."
            : undefined
        }
      >
        <View style={styles.chips} testID="category-picker" accessibilityRole="radiogroup">
          <SelectChip
            testID="category-option-none"
            label="Automática"
            dashed
            selected={!categoryId}
            onPress={() => setValue("categoryId", undefined, { shouldValidate: true })}
          />
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
        </View>
      </Field>

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
    </FormScreen>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  split: {
    gap: space.lg,
  },
  preview: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
  },
  chips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: space.sm,
  },
});
