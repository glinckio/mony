import { zodResolver } from "@hookform/resolvers/zod";
import { createGoalInputSchema, type Category, type CreateGoalInput } from "@mony/shared-types";
import { useNavigation, useRoute, type RouteProp } from "@react-navigation/native";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { StyleSheet, View } from "react-native";

import { AmountField, GoalProgress } from "../../components/domain";
import {
  Button,
  Card,
  Checkbox,
  Field,
  FormScreen,
  InlineNotice,
  SelectChip,
  TextField,
  type IconName,
} from "../../components/ui";
import { apiFetch } from "../../lib/api-client";
import { formatDateDisplay, formatDateInputDigits, parseDateInputToISO } from "../../lib/date-mask";
import { useToastStore } from "../../lib/toast-store";
import type { AppStackNavigation, AppStackParamList } from "../../navigation/RootNavigator";
import { space } from "../../theme";
import { haptic } from "../../theme/haptics";

// Meta (form) (design/telas.md §7): the target amount as the hero, a live
// preview of the goal's progress bar, then the details.
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
  const title = watch("title");
  const targetAmount = watch("targetAmount");
  const currentAmount = watch("currentAmount");

  const { data: categories } = useQuery({
    queryKey: ["categories"],
    queryFn: () => apiFetch<Category[]>("/categories"),
  });
  const previewColor = categories?.find((category) => category.id === categoryId)?.color;

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
      haptic.success();
      useToastStore
        .getState()
        .show(
          completed && !editing?.completed
            ? "Meta alcançada! Parabéns."
            : editing
              ? "Meta atualizada."
              : "Meta criada.",
          { tone: "success" },
        );
      navigation.goBack();
    } catch {
      haptic.error();
      setSubmitError("Algo deu errado. Tente novamente.");
    }
  };

  return (
    <FormScreen
      title={editing ? "Editar meta" : "Nova meta"}
      onClose={() => navigation.goBack()}
      footer={
        <>
          {submitError ? <InlineNotice tone="danger" message={submitError} /> : null}
          <Button
            testID="submit-button"
            label={editing ? "Salvar alterações" : "Criar meta"}
            onPress={handleSubmit(onSubmit)}
            loading={isSubmitting}
          />
        </>
      }
    >
      <Controller
        control={control}
        name="title"
        render={({ field }) => (
          <TextField
            testID="title-input"
            label="Título"
            placeholder="Ex.: Viagem de férias"
            value={field.value}
            onChangeText={field.onChange}
            returnKeyType="next"
            error={errors.title?.message}
          />
        )}
      />

      <Controller
        control={control}
        name="targetAmount"
        render={({ field }) => (
          <AmountField
            testID="target-amount-input"
            label="Valor da meta"
            value={field.value}
            onChangeValue={field.onChange}
            error={errors.targetAmount?.message}
          />
        )}
      />

      <Controller
        control={control}
        name="currentAmount"
        render={({ field }) => (
          <AmountField
            testID="current-amount-input"
            size="compact"
            label="Já guardado"
            value={field.value}
            onChangeValue={field.onChange}
            error={errors.currentAmount?.message}
          />
        )}
      />

      {targetAmount ? (
        <Card>
          <GoalProgress
            title={title || "Sua meta"}
            currentAmount={String(currentAmount ?? 0)}
            targetAmount={String(targetAmount)}
            targetDate={parseDateInputToISO(dateDisplay) || null}
            completed={completed}
            color={previewColor}
          />
        </Card>
      ) : null}

      <Controller
        control={control}
        name="targetDate"
        render={({ field }) => (
          <TextField
            testID="target-date-input"
            label="Data limite (opcional)"
            leftIcon="calendar-outline"
            value={dateDisplay}
            onChangeText={(text) => {
              setDateDisplay(formatDateInputDigits(text));
              field.onChange(parseDateInputToISO(text) || undefined);
            }}
            keyboardType="number-pad"
            placeholder="DD/MM/AAAA"
            maxLength={10}
            error={errors.targetDate?.message}
          />
        )}
      />

      <Field label="Categoria (opcional)">
        <View style={styles.chips} testID="category-picker" accessibilityRole="radiogroup">
          <SelectChip
            testID="category-option-none"
            label="Nenhuma"
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
        name="description"
        render={({ field }) => (
          <TextField
            testID="description-input"
            label="Descrição (opcional)"
            value={field.value ?? ""}
            onChangeText={field.onChange}
            multiline
            error={errors.description?.message}
          />
        )}
      />

      {editing ? (
        <Card>
          <Checkbox
            testID="completed-toggle"
            label="Meta concluída"
            description="Ela vai para a lista de concluídas."
            checked={completed}
            onChange={setCompleted}
          />
        </Card>
      ) : null}
    </FormScreen>
  );
}

const styles = StyleSheet.create({
  chips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: space.sm,
  },
});
