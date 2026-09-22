import { Ionicons } from "@expo/vector-icons";
import type { Category, CategoryType } from "@mony/shared-types";
import { color, radius, size as sizeTokens, spacing } from "@mony/ui-tokens";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { useCallback, useState } from "react";
import { Alert, StyleSheet, TouchableOpacity, View } from "react-native";

import { AppHeader, Button, Screen, Text } from "../../components/ui";
import { ApiError, apiFetch } from "../../lib/api-client";
import type { MainTabNavigation } from "../../navigation/RootNavigator";

interface ReplacementPrompt {
  categoryId: string;
  categoryName: string;
  type: CategoryType;
}

export function CategoriesScreen() {
  const navigation = useNavigation<MainTabNavigation>();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [replacementPrompt, setReplacementPrompt] = useState<ReplacementPrompt | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    apiFetch<Category[]>("/categories")
      .then(setCategories)
      .catch(() => setError("Algo deu errado. Tente novamente."))
      .finally(() => setLoading(false));
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const performDelete = async (categoryId: string, replacementCategoryId?: string) => {
    try {
      const query = replacementCategoryId
        ? `?replacementCategoryId=${replacementCategoryId}`
        : "";
      await apiFetch(`/categories/${categoryId}${query}`, { method: "DELETE" });
      setReplacementPrompt(null);
      load();
    } catch (err) {
      if (err instanceof ApiError && err.statusCode === 400) {
        const category = categories.find((c) => c.id === categoryId);
        if (category) {
          setReplacementPrompt({
            categoryId,
            categoryName: category.name,
            type: category.type,
          });
          return;
        }
      }
      setError("Algo deu errado. Tente novamente.");
    }
  };

  const confirmDelete = (category: Category) => {
    Alert.alert("Excluir categoria", `Excluir "${category.name}"?`, [
      { text: "Cancelar", style: "cancel" },
      { text: "Excluir", style: "destructive", onPress: () => performDelete(category.id) },
    ]);
  };

  if (loading) {
    return (
      <Screen centered>
        <Text variant="caption">Carregando...</Text>
      </Screen>
    );
  }

  const expenseCategories = categories.filter((c) => c.type === "EXPENSE");
  const incomeCategories = categories.filter((c) => c.type === "INCOME");
  const replacementOptions = replacementPrompt
    ? categories.filter((c) => c.type === replacementPrompt.type && c.id !== replacementPrompt.categoryId)
    : [];

  return (
    <Screen>
      <AppHeader title="Categorias" />

      {error && (
        <View style={styles.errorBanner}>
          <Ionicons name="alert-circle-outline" size={sizeTokens.iconSm} color={color.danger} />
          <Text variant="caption" color={color.danger}>
            {error}
          </Text>
        </View>
      )}

      {replacementPrompt && (
        <View style={styles.replacementBanner} testID="replacement-prompt">
          <Text variant="bodyStrong">
            "{replacementPrompt.categoryName}" está em uso. Escolha uma categoria para substituir
            as transações:
          </Text>
          <View style={styles.replacementOptions}>
            {replacementOptions.map((option) => (
              <TouchableOpacity
                key={option.id}
                testID={`replacement-option-${option.id}`}
                style={styles.replacementOption}
                onPress={() => performDelete(replacementPrompt.categoryId, option.id)}
              >
                <Ionicons name={option.icon} size={sizeTokens.iconSm} color={option.color} />
                <Text variant="caption">{option.name}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <TouchableOpacity
            testID="cancel-replacement"
            onPress={() => setReplacementPrompt(null)}
            style={styles.cancelReplacement}
          >
            <Text variant="caption" color={color.textSecondary}>
              Cancelar
            </Text>
          </TouchableOpacity>
        </View>
      )}

      <CategorySection
        title="Despesas"
        categories={expenseCategories}
        onEdit={(category) => navigation.navigate("CategoryForm", { category })}
        onDelete={confirmDelete}
      />
      <CategorySection
        title="Receitas"
        categories={incomeCategories}
        onEdit={(category) => navigation.navigate("CategoryForm", { category })}
        onDelete={confirmDelete}
      />

      <Button
        testID="add-category-button"
        label="Nova categoria"
        onPress={() => navigation.navigate("CategoryForm", undefined)}
      />
    </Screen>
  );
}

interface CategorySectionProps {
  title: string;
  categories: Category[];
  onEdit: (category: Category) => void;
  onDelete: (category: Category) => void;
}

function CategorySection({ title, categories, onEdit, onDelete }: CategorySectionProps) {
  return (
    <View style={styles.section}>
      <Text variant="bodyStrong">{title}</Text>
      {categories.length === 0 ? (
        <Text variant="caption" color={color.textSecondary}>
          Nenhuma categoria ainda.
        </Text>
      ) : (
        categories.map((category) => (
          <View key={category.id} style={styles.row} testID={`category-row-${category.id}`}>
            <View style={[styles.iconBadge, { backgroundColor: category.color }]}>
              <Ionicons name={category.icon} size={sizeTokens.iconSm} color={color.onPrimary} />
            </View>
            <Text variant="body" style={styles.rowName}>
              {category.name}
            </Text>
            <TouchableOpacity
              testID={`edit-category-${category.id}`}
              accessibilityRole="button"
              accessibilityLabel={`Editar ${category.name}`}
              hitSlop={8}
              onPress={() => onEdit(category)}
            >
              <Ionicons name="pencil-outline" size={sizeTokens.iconSm} color={color.textSecondary} />
            </TouchableOpacity>
            <TouchableOpacity
              testID={`delete-category-${category.id}`}
              accessibilityRole="button"
              accessibilityLabel={`Excluir ${category.name}`}
              hitSlop={8}
              style={styles.deleteButton}
              onPress={() => onDelete(category)}
            >
              <Ionicons name="trash-outline" size={sizeTokens.iconSm} color={color.danger} />
            </TouchableOpacity>
          </View>
        ))
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    backgroundColor: color.dangerMuted,
    borderRadius: radius.sm,
    padding: spacing.sm,
    marginBottom: spacing.md,
  },
  replacementBanner: {
    backgroundColor: color.warningMuted,
    borderRadius: radius.md,
    padding: spacing.sm,
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  replacementOptions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  replacementOption: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    backgroundColor: color.surface,
    borderRadius: radius.sm,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  cancelReplacement: {
    alignSelf: "flex-start",
  },
  section: {
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  iconBadge: {
    width: sizeTokens.touchTarget,
    height: sizeTokens.touchTarget,
    borderRadius: radius.xl,
    alignItems: "center",
    justifyContent: "center",
  },
  rowName: {
    flex: 1,
  },
  deleteButton: {
    marginLeft: spacing.sm,
  },
});
