import { zodResolver } from "@hookform/resolvers/zod";
import {
  createCategoryInputSchema,
  type CategoryIcon,
  type CategoryType,
  type CreateCategoryInput,
} from "@mony/shared-types";
import { useNavigation, useRoute, type RouteProp } from "@react-navigation/native";
import { useCallback, useState } from "react";
import { Controller, useForm, useWatch, type Control } from "react-hook-form";
import { StyleSheet, View } from "react-native";

import {
  Button,
  Card,
  ColorPicker,
  Field,
  FormScreen,
  IconBadge,
  IconPicker,
  InlineNotice,
  SegmentedControl,
  Text,
  TextField,
  type IconName,
} from "../../components/ui";
import { apiFetch } from "../../lib/api-client";
import { queryClient } from "../../lib/query-client";
import type { AppStackNavigation, AppStackParamList } from "../../navigation/RootNavigator";
import { space, useTheme } from "../../theme";
import { haptic } from "../../theme/haptics";

const TYPE_OPTIONS: Array<{ value: CategoryType; label: string }> = [
  { value: "EXPENSE", label: "Despesa" },
  { value: "INCOME", label: "Receita" },
];

// Categoria (form) (design/telas.md §18): a live preview of the category
// badge on top (changes with name, color and icon), then the fields.
export function CategoryFormScreen() {
  const navigation = useNavigation<AppStackNavigation>();
  const route = useRoute<RouteProp<AppStackParamList, "CategoryForm">>();
  const editing = route.params?.category;
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<CreateCategoryInput>({
    resolver: zodResolver(createCategoryInputSchema),
    defaultValues: {
      name: editing?.name ?? "",
      // Opened from the transaction form's "Criar categoria": its current type.
      type: editing?.type ?? route.params?.type ?? "EXPENSE",
      color: editing?.color,
      icon: (editing?.icon as CategoryIcon) ?? undefined,
    },
  });

  // Only the taps re-render the form; typing the name re-renders just the
  // preview (it watches the name itself).
  const [type, selectedColor, selectedIcon] = useWatch({
    control,
    name: ["type", "color", "icon"],
  });
  const onTypeChange = useCallback(
    (value: CategoryType) => setValue("type", value, { shouldValidate: true }),
    [setValue],
  );
  const onColorChange = useCallback(
    (value: string) => setValue("color", value, { shouldValidate: true }),
    [setValue],
  );
  const onIconChange = useCallback(
    (value: CategoryIcon) => setValue("icon", value, { shouldValidate: true }),
    [setValue],
  );

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
      // Every category list (the transaction form's picker underneath, the
      // list's badges) refetches — the prefix covers ["categories", type].
      void queryClient.invalidateQueries({ queryKey: ["categories"] });
      haptic.success();
      navigation.goBack();
    } catch {
      haptic.error();
      setSubmitError("Algo deu errado. Tente novamente.");
    }
  };

  return (
    <FormScreen
      title={editing ? "Editar categoria" : "Nova categoria"}
      onClose={() => navigation.goBack()}
      footer={
        <>
          {submitError ? <InlineNotice tone="danger" message={submitError} /> : null}
          <Button
            testID="submit-button"
            label={editing ? "Salvar alterações" : "Criar categoria"}
            onPress={handleSubmit(onSubmit)}
            loading={isSubmitting}
          />
        </>
      }
    >
      <CategoryPreview control={control} />

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

      <Field label="Tipo">
        <SegmentedControl
          testID="type-option"
          accessibilityLabel="Tipo"
          options={TYPE_OPTIONS}
          value={type}
          disabled={!!editing}
          onChange={onTypeChange}
        />
      </Field>

      <Field label="Cor" error={errors.color?.message}>
        <ColorPicker testID="color-picker" value={selectedColor} onChange={onColorChange} />
      </Field>

      <Field label="Ícone" error={errors.icon?.message}>
        <IconPicker
          testID="icon-picker"
          value={selectedIcon}
          tint={selectedColor}
          onChange={onIconChange}
        />
      </Field>
    </FormScreen>
  );
}

function CategoryPreview({ control }: { control: Control<CreateCategoryInput> }) {
  const { colors } = useTheme();
  const [name, type, color, icon] = useWatch({ control, name: ["name", "type", "color", "icon"] });
  return (
    <Card style={styles.preview}>
      <IconBadge
        icon={(icon as IconName | undefined) ?? "pricetag-outline"}
        color={color ?? colors.primary}
        size={56}
      />
      <View style={styles.flex}>
        <Text variant="title3" numberOfLines={1}>
          {name || "Nome da categoria"}
        </Text>
        <Text variant="footnote" tone="muted">
          {type === "INCOME" ? "Receita" : "Despesa"}
        </Text>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  preview: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.lg,
  },
});
