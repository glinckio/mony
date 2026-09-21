import { Ionicons } from "@expo/vector-icons";
import { zodResolver } from "@hookform/resolvers/zod";
import { createGoalInputSchema, type Category, type CreateGoalInput } from "@mony/shared-types";
import { color, radius, size as sizeTokens, spacing } from "@mony/ui-tokens";
import { useNavigation, useRoute, type RouteProp } from "@react-navigation/native";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { StyleSheet, TouchableOpacity, View } from "react-native";

import { Button, Screen, Text, TextField } from "../../components/ui";
import { apiFetch } from "../../lib/api-client";
import { formatAmountDisplay, parseAmountInput } from "../../lib/currency-mask";
import { formatDateDisplay, formatDateInputDigits, parseDateInputToISO } from "../../lib/date-mask";
import type { AppStackNavigation, AppStackParamList } from "../../navigation/RootNavigator";

export function GoalFormScreen() {
  const navigation = useNavigation<AppStackNavigation>();
  const queryClient = useQueryClient();
  const route = useRoute<RouteProp<AppStackParamList, "GoalForm">>();
  const editing = route.params?.goal;
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [completed, setCompleted] = useState(editing?.completed ?? false);
  const [dateDisplay, setDateDisplay] = useState(
    editing?.targetDate ? formatDateDisplay(editing.targetDate) : "",
  );

  const {
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<CreateGoalInput>({
    resolver: zodResolver(createGoalInputSchema),
    defaultValues: {
      title: editing?.title ?? "",
      description: editing?.description ?? undefined,
      targetAmount: editing ? Number(editing.targetAmount) : undefined,
      currentAmount: editing ? Number(editing.currentAmount) : 0,
      targetDate: editing?.targetDate ?? undefined,
      categoryId: editing?.categoryId ?? undefined,
    },
  });

  const categoryId = watch("categoryId");

  const { data: categories } = useQuery({
    queryKey: ["categories"],
    queryFn: () => apiFetch<Category[]>("/categories"),
  });

  const onSubmit = async (data: CreateGoalInput) => {
    setSubmitError(null);
    try {
      if (editing) {
        await apiFetch(`/goals/${editing.id}`, {
          method: "PATCH",
          body: JSON.stringify({ ...data, completed }),
        });
      } else {
        await apiFetch("/goals", { method: "POST", body: JSON.stringify(data) });
      }
      await queryClient.invalidateQueries({ queryKey: ["goals"] });
      navigation.goBack();
    } catch {
      setSubmitError("Algo deu errado. Tente novamente.");
    }
  };

  return (
    <Screen>
      <View style={styles.header}>
        <Text variant="heading">{editing ? "Editar meta" : "Nova meta"}</Text>
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
        <Controller
          control={control}
          name="title"
          render={({ field }) => (
            <TextField
              testID="title-input"
              label="Título"
              value={field.value}
              onChangeText={field.onChange}
              error={errors.title?.message}
            />
          )}
        />

        <Controller
          control={control}
          name="description"
          render={({ field }) => (
            <TextField
              testID="description-input"
              label="Descrição (opcional)"
              value={field.value ?? ""}
              onChangeText={field.onChange}
              error={errors.description?.message}
            />
          )}
        />

        <Controller
          control={control}
          name="targetAmount"
          render={({ field }) => (
            <TextField
              testID="target-amount-input"
              label="Valor da meta"
              value={formatAmountDisplay(field.value)}
              onChangeText={(text) => field.onChange(parseAmountInput(text))}
              keyboardType="number-pad"
              placeholder="R$ 0,00"
              error={errors.targetAmount?.message}
            />
          )}
        />

        <Controller
          control={control}
          name="currentAmount"
          render={({ field }) => (
            <TextField
              testID="current-amount-input"
              label="Valor atual"
              value={formatAmountDisplay(field.value)}
              onChangeText={(text) => field.onChange(parseAmountInput(text))}
              keyboardType="number-pad"
              placeholder="R$ 0,00"
              error={errors.currentAmount?.message}
            />
          )}
        />

        <Controller
          control={control}
          name="targetDate"
          render={({ field }) => (
            <TextField
              testID="target-date-input"
              label="Data limite (opcional)"
              value={dateDisplay}
              onChangeText={(text) => {
                setDateDisplay(formatDateInputDigits(text));
                field.onChange(parseDateInputToISO(text) || undefined);
              }}
              keyboardType="number-pad"
              placeholder="DD/MM/AAAA"
              error={errors.targetDate?.message}
            />
          )}
        />

        <View>
          <Text variant="caption" style={styles.fieldLabel}>
            Categoria (opcional)
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
                Nenhuma
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
        </View>

        {editing && (
          <TouchableOpacity
            testID="completed-toggle"
            accessibilityRole="button"
            accessibilityState={{ selected: completed }}
            style={styles.completedRow}
            onPress={() => setCompleted((value) => !value)}
          >
            <Ionicons
              name={completed ? "checkbox" : "square-outline"}
              size={sizeTokens.iconMd}
              color={color.primary}
            />
            <Text variant="body">Meta concluída</Text>
          </TouchableOpacity>
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
        label={editing ? "Salvar alterações" : "Criar meta"}
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
  completedRow: {
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
