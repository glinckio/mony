import { Ionicons } from "@expo/vector-icons";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  createCategoryInputSchema,
  type CategoryIcon,
  type CategoryType,
  type CreateCategoryInput,
} from "@mony/shared-types";
import { color, radius, size as sizeTokens, spacing } from "@mony/ui-tokens";
import { useNavigation, useRoute, type RouteProp } from "@react-navigation/native";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { StyleSheet, TouchableOpacity, View } from "react-native";

import {
  Button,
  ColorSwatchPicker,
  IconGridPicker,
  Screen,
  Text,
  TextField,
} from "../../components/ui";
import { apiFetch } from "../../lib/api-client";
import type { AppStackNavigation, AppStackParamList } from "../../navigation/RootNavigator";

const TYPE_OPTIONS: Array<{ value: CategoryType; label: string }> = [
  { value: "EXPENSE", label: "Despesa" },
  { value: "INCOME", label: "Receita" },
];

export function CategoryFormScreen() {
  const navigation = useNavigation<AppStackNavigation>();
  const route = useRoute<RouteProp<AppStackParamList, "CategoryForm">>();
  const editing = route.params?.category;
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<CreateCategoryInput>({
    resolver: zodResolver(createCategoryInputSchema),
    defaultValues: {
      name: editing?.name ?? "",
      type: editing?.type ?? "EXPENSE",
      color: editing?.color,
      icon: (editing?.icon as CategoryIcon) ?? undefined,
    },
  });

  const type = watch("type");
  const selectedColor = watch("color");
  const selectedIcon = watch("icon");

  const onSubmit = async (data: CreateCategoryInput) => {
    setSubmitError(null);
    try {
      if (editing) {
        await apiFetch(`/categories/${editing.id}`, {
          method: "PATCH",
          body: JSON.stringify({ name: data.name, color: data.color, icon: data.icon }),
        });
      } else {
        await apiFetch("/categories", { method: "POST", body: JSON.stringify(data) });
      }
      navigation.goBack();
    } catch {
      setSubmitError("Algo deu errado. Tente novamente.");
    }
  };

  return (
    <Screen>
      <View style={styles.header}>
        <Text variant="heading">{editing ? "Editar categoria" : "Nova categoria"}</Text>
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
          name="name"
          render={({ field }) => (
            <TextField
              testID="name-input"
              label="Nome"
              value={field.value}
              onChangeText={field.onChange}
              autoCapitalize="words"
              error={errors.name?.message}
            />
          )}
        />

        <View>
          <Text variant="caption" style={styles.fieldLabel}>
            Tipo
          </Text>
          <View style={styles.typeRow}>
            {TYPE_OPTIONS.map((option) => {
              const selected = option.value === type;
              return (
                <TouchableOpacity
                  key={option.value}
                  testID={`type-option-${option.value}`}
                  accessibilityRole="button"
                  accessibilityState={{ selected, disabled: !!editing }}
                  disabled={!!editing}
                  style={[
                    styles.typeOption,
                    selected && styles.typeOptionSelected,
                    !!editing && styles.typeOptionDisabled,
                  ]}
                  onPress={() => setValue("type", option.value, { shouldValidate: true })}
                >
                  <Text
                    variant="bodyStrong"
                    color={selected ? color.onPrimary : color.textSecondary}
                  >
                    {option.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <View>
          <Text variant="caption" style={styles.fieldLabel}>
            Cor
          </Text>
          <ColorSwatchPicker
            testID="color-picker"
            value={selectedColor}
            onChange={(value) => setValue("color", value, { shouldValidate: true })}
          />
          {errors.color?.message && (
            <Text variant="caption" color={color.danger} style={styles.fieldError}>
              {errors.color.message}
            </Text>
          )}
        </View>

        <View>
          <Text variant="caption" style={styles.fieldLabel}>
            Ícone
          </Text>
          <IconGridPicker
            testID="icon-picker"
            value={selectedIcon}
            onChange={(value) => setValue("icon", value, { shouldValidate: true })}
          />
          {errors.icon?.message && (
            <Text variant="caption" color={color.danger} style={styles.fieldError}>
              {errors.icon.message}
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
        label={editing ? "Salvar alterações" : "Criar categoria"}
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
  typeRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  typeOption: {
    flex: 1,
    minHeight: sizeTokens.controlHeight,
    borderRadius: radius.md,
    backgroundColor: color.surfaceAlt,
    alignItems: "center",
    justifyContent: "center",
  },
  typeOptionSelected: {
    backgroundColor: color.primary,
  },
  typeOptionDisabled: {
    opacity: 0.6,
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
