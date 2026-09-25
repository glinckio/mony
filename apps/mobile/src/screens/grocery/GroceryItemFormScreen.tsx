import { Ionicons } from "@expo/vector-icons";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  GROCERY_CATEGORIES,
  createGroceryItemInputSchema,
  type CreateGroceryItemInput,
  type GroceryItem,
} from "@mony/shared-types";
import { color, radius, size as sizeTokens, spacing } from "@mony/ui-tokens";
import { useNavigation, useRoute, type RouteProp } from "@react-navigation/native";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { Alert, StyleSheet, TouchableOpacity, View } from "react-native";

import { Button, Screen, Text, TextField } from "../../components/ui";
import { apiFetch } from "../../lib/api-client";
import { formatAmountDisplay, parseAmountInput } from "../../lib/currency-mask";
import {
  formatDecimalInput,
  parseDecimalInput,
  sanitizeDecimalInput,
} from "../../lib/decimal-input";
import { GROCERY_CATEGORY_LABELS } from "../../lib/grocery-display";
import type { AppStackNavigation, AppStackParamList } from "../../navigation/RootNavigator";

export function GroceryItemFormScreen() {
  const navigation = useNavigation<AppStackNavigation>();
  const queryClient = useQueryClient();
  const route = useRoute<RouteProp<AppStackParamList, "GroceryItemForm">>();
  const editing = route.params?.item;
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
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
      navigation.goBack();
    } catch {
      setSubmitError("Algo deu errado. Tente novamente.");
    }
  };

  const confirmDelete = () => {
    if (!editing) return;
    Alert.alert("Excluir item", `Excluir "${editing.name}" da lista?`, [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Excluir",
        style: "destructive",
        onPress: async () => {
          setDeleting(true);
          try {
            await apiFetch(`/grocery/items/${editing.id}`, { method: "DELETE" });
            await invalidateGrocery();
            navigation.goBack();
          } catch {
            setDeleting(false);
            Alert.alert("Erro", "Não foi possível excluir. Tente novamente.");
          }
        },
      },
    ]);
  };

  return (
    <Screen>
      <View style={styles.header}>
        <Text variant="heading">{editing ? "Editar item" : "Novo item"}</Text>
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
          <View style={styles.rowField}>
            <Controller
              control={control}
              name="idealQuantity"
              render={({ field }) => (
                <TextField
                  testID="ideal-quantity-input"
                  label="Quantidade ideal"
                  value={idealDisplay}
                  onChangeText={(text) => {
                    const sanitized = sanitizeDecimalInput(text);
                    setIdealDisplay(sanitized);
                    field.onChange(parseDecimalInput(sanitized));
                  }}
                  keyboardType="decimal-pad"
                  placeholder="0"
                  error={errors.idealQuantity?.message}
                />
              )}
            />
          </View>
          <View style={styles.rowField}>
            <Controller
              control={control}
              name="currentQuantity"
              render={({ field }) => (
                <TextField
                  testID="current-quantity-input"
                  label="Quantidade atual"
                  value={currentDisplay}
                  onChangeText={(text) => {
                    const sanitized = sanitizeDecimalInput(text);
                    setCurrentDisplay(sanitized);
                    field.onChange(parseDecimalInput(sanitized) ?? 0);
                  }}
                  keyboardType="decimal-pad"
                  placeholder="0"
                  error={errors.currentQuantity?.message}
                />
              )}
            />
          </View>
        </View>

        <Controller
          control={control}
          name="estimatedPrice"
          render={({ field }) => (
            <TextField
              testID="estimated-price-input"
              label="Preço estimado (por unidade)"
              value={formatAmountDisplay(field.value)}
              onChangeText={(text) => field.onChange(parseAmountInput(text))}
              keyboardType="number-pad"
              placeholder="R$ 0,00"
              error={errors.estimatedPrice?.message}
            />
          )}
        />

        <View>
          <Text variant="caption" style={styles.fieldLabel}>
            Categoria
          </Text>
          <View style={styles.categoryList} testID="grocery-category-picker">
            {GROCERY_CATEGORIES.map((option) => {
              const selected = option === category;
              return (
                <TouchableOpacity
                  key={option}
                  testID={`grocery-category-${option}`}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  style={[styles.categoryChip, selected && styles.categoryChipSelected]}
                  onPress={() => setValue("category", option, { shouldValidate: true })}
                >
                  <Text variant="caption" color={selected ? color.onPrimary : color.textPrimary}>
                    {GROCERY_CATEGORY_LABELS[option]}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
          {errors.category?.message && (
            <Text variant="caption" color={color.danger} style={styles.fieldError}>
              {errors.category.message}
            </Text>
          )}
        </View>
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
        label={editing ? "Salvar alterações" : "Adicionar item"}
        onPress={handleSubmit(onSubmit)}
        loading={isSubmitting}
        disabled={deleting}
      />
      {editing && (
        <Button
          testID="delete-grocery-item"
          label="Excluir item"
          variant="ghost"
          loading={deleting}
          disabled={isSubmitting}
          onPress={confirmDelete}
        />
      )}
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
  row: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  rowField: {
    flex: 1,
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
    backgroundColor: color.surfaceAlt,
    borderRadius: radius.sm,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  categoryChipSelected: {
    backgroundColor: color.primary,
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
