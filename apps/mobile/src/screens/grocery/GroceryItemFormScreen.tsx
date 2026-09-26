import { zodResolver } from "@hookform/resolvers/zod";
import {
  GROCERY_CATEGORIES,
  createGroceryItemInputSchema,
  type CreateGroceryItemInput,
  type GroceryItem,
} from "@mony/shared-types";
import { useNavigation, useRoute, type RouteProp } from "@react-navigation/native";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { StyleSheet, View } from "react-native";

import { AmountField } from "../../components/domain";
import {
  Button,
  Card,
  ConfirmSheet,
  Field,
  FormScreen,
  InlineNotice,
  SelectChip,
  TextField,
} from "../../components/ui";
import { apiFetch } from "../../lib/api-client";
import {
  formatDecimalInput,
  parseDecimalInput,
  sanitizeDecimalInput,
} from "../../lib/decimal-input";
import { GROCERY_CATEGORY_LABELS } from "../../lib/grocery-display";
import type { AppStackNavigation, AppStackParamList } from "../../navigation/RootNavigator";
import { space } from "../../theme";
import { haptic } from "../../theme/haptics";

// Item do mercado (form) (design/telas.md §13): name and unit, how much
// there is and how much is needed side by side, price per unit, category.
export function GroceryItemFormScreen() {
  const navigation = useNavigation<AppStackNavigation>();
  const queryClient = useQueryClient();
  const route = useRoute<RouteProp<AppStackParamList, "GroceryItemForm">>();
  const editing = route.params?.item;
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  // Free-typed decimal display ("1,5") kept apart from the numeric value
  // RHF/zod validate — see lib/decimal-input.ts.
  const [idealDisplay, setIdealDisplay] = useState(formatDecimalInput(editing?.idealQuantity));
  const [currentDisplay, setCurrentDisplay] = useState(
    formatDecimalInput(editing?.currentQuantity ?? 0),
  );

  const {
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<CreateGroceryItemInput>({
    resolver: zodResolver(createGroceryItemInputSchema),
    defaultValues: {
      name: editing?.name ?? "",
      unit: editing?.unit ?? "",
      idealQuantity: editing ? Number(editing.idealQuantity) : undefined,
      currentQuantity: editing ? Number(editing.currentQuantity) : 0,
      estimatedPrice: editing ? Number(editing.estimatedPrice) : undefined,
      category: editing?.category,
    },
  });

  const category = watch("category");

  // Items and the summary change; the budget doesn't.
  const invalidateGrocery = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: ["grocery", "items"] }),
      queryClient.invalidateQueries({ queryKey: ["grocery", "summary"] }),
    ]);

  const onSubmit = async (data: CreateGroceryItemInput) => {
    setSubmitError(null);
    try {
      await apiFetch<GroceryItem>(editing ? `/grocery/items/${editing.id}` : "/grocery/items", {
        method: editing ? "PATCH" : "POST",
        body: JSON.stringify(data),
      });
      await invalidateGrocery();
      haptic.success();
      navigation.goBack();
    } catch {
      haptic.error();
      setSubmitError("Algo deu errado. Tente novamente.");
    }
  };

  const performDelete = async () => {
    if (!editing) return;
    setDeleting(true);
    try {
      await apiFetch(`/grocery/items/${editing.id}`, { method: "DELETE" });
      await invalidateGrocery();
      setConfirmDelete(false);
      navigation.goBack();
    } catch {
      setDeleting(false);
      // Shown inside the sheet: this screen is an iOS modal, and the app's
      // toast renders behind it.
      setDeleteError("Não foi possível excluir. Tente novamente.");
    }
  };

  return (
    <FormScreen
      title={editing ? "Editar item" : "Novo item"}
      onClose={() => navigation.goBack()}
      footer={
        <>
          {submitError ? <InlineNotice tone="danger" message={submitError} /> : null}
          <Button
            testID="submit-button"
            label={editing ? "Salvar alterações" : "Adicionar item"}
            onPress={handleSubmit(onSubmit)}
            loading={isSubmitting}
            disabled={deleting}
          />
        </>
      }
    >
      <Card style={styles.card}>
        <Controller
          control={control}
          name="name"
          render={({ field }) => (
            <TextField
              testID="name-input"
              label="Nome"
              value={field.value}
              onChangeText={field.onChange}
              placeholder="Ex.: Arroz"
              error={errors.name?.message}
            />
          )}
        />
        <Controller
          control={control}
          name="unit"
          render={({ field }) => (
            <TextField
              testID="unit-input"
              label="Unidade"
              value={field.value}
              onChangeText={field.onChange}
              placeholder="Ex.: kg, un, pacote"
              autoCapitalize="none"
              error={errors.unit?.message}
            />
          )}
        />
        <View style={styles.row}>
          <Controller
            control={control}
            name="currentQuantity"
            render={({ field }) => (
              <TextField
                testID="current-quantity-input"
                label="Tenho"
                value={currentDisplay}
                onChangeText={(text) => {
                  const sanitized = sanitizeDecimalInput(text);
                  setCurrentDisplay(sanitized);
                  field.onChange(parseDecimalInput(sanitized) ?? 0);
                }}
                keyboardType="decimal-pad"
                placeholder="0"
                containerStyle={styles.flex}
                error={errors.currentQuantity?.message}
              />
            )}
          />
          <Controller
            control={control}
            name="idealQuantity"
            render={({ field }) => (
              <TextField
                testID="ideal-quantity-input"
                label="Preciso ter"
                value={idealDisplay}
                onChangeText={(text) => {
                  const sanitized = sanitizeDecimalInput(text);
                  setIdealDisplay(sanitized);
                  field.onChange(parseDecimalInput(sanitized));
                }}
                keyboardType="decimal-pad"
                placeholder="0"
                containerStyle={styles.flex}
                error={errors.idealQuantity?.message}
              />
            )}
          />
        </View>
      </Card>

      <Controller
        control={control}
        name="estimatedPrice"
        render={({ field }) => (
          <AmountField
            testID="estimated-price-input"
            size="compact"
            label="Preço estimado (por unidade)"
            value={field.value}
            onChangeValue={field.onChange}
            error={errors.estimatedPrice?.message}
          />
        )}
      />

      <Field label="Categoria" error={errors.category?.message}>
        <View style={styles.chips} testID="grocery-category-picker" accessibilityRole="radiogroup">
          {GROCERY_CATEGORIES.map((option) => (
            <SelectChip
              key={option}
              testID={`grocery-category-${option}`}
              label={GROCERY_CATEGORY_LABELS[option]}
              selected={option === category}
              onPress={() => setValue("category", option, { shouldValidate: true })}
            />
          ))}
        </View>
      </Field>

      {editing ? (
        <Button
          testID="delete-grocery-item"
          label="Excluir item"
          leftIcon="trash-outline"
          variant="dangerGhost"
          disabled={isSubmitting}
          onPress={() => setConfirmDelete(true)}
        />
      ) : null}

      <ConfirmSheet
        visible={confirmDelete}
        title={editing ? `Excluir "${editing.name}" da lista?` : ""}
        message="Você pode adicionar de novo quando quiser."
        confirmLabel="Excluir item"
        busy={deleting}
        error={deleteError}
        onConfirm={() => void performDelete()}
        onClose={() => {
          setConfirmDelete(false);
          setDeleteError(null);
        }}
      />
    </FormScreen>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  card: {
    gap: space.lg,
  },
  row: {
    flexDirection: "row",
    gap: space.md,
  },
  chips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: space.sm,
  },
});
