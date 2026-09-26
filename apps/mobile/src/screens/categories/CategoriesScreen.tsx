import type { Category, CategoryType } from "@mony/shared-types";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { useCallback, useRef, useState } from "react";
import { StyleSheet, View } from "react-native";

import {
  Card,
  ConfirmSheet,
  IconBadge,
  IconButton,
  InlineNotice,
  PaperSheet,
  ScrollScreen,
  Skeleton,
  Text,
  Touchable,
  Button,
  type IconName,
} from "../../components/ui";
import { ApiError, apiFetch } from "../../lib/api-client";
import { queryClient } from "../../lib/query-client";
import type { AppStackNavigation } from "../../navigation/RootNavigator";
import { radius, space, useTheme } from "../../theme";

interface ReplacementPrompt {
  categoryId: string;
  categoryName: string;
  type: CategoryType;
}

// Categorias (design/telas.md §17): expenses and income as two white cards
// of rows (the category's own color and icon, edit and delete). Deleting
// one that's in use asks where its transactions should go.
export function CategoriesScreen() {
  const navigation = useNavigation<AppStackNavigation>();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Category | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [replacementPrompt, setReplacementPrompt] = useState<ReplacementPrompt | null>(null);
  // A category in use comes back as 400 while the confirm sheet is open:
  // the replacement sheet waits for it to leave the screen (iOS can't
  // present two Modals at once).
  const queuedReplacement = useRef<ReplacementPrompt | null>(null);

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
    setDeleting(true);
    try {
      const query = replacementCategoryId ? `?replacementCategoryId=${replacementCategoryId}` : "";
      await apiFetch(`/categories/${categoryId}${query}`, { method: "DELETE" });
      // The transaction form's picker and the list badges read the cache.
      void queryClient.invalidateQueries({ queryKey: ["categories"] });
      setReplacementPrompt(null);
      setPendingDelete(null);
      load();
    } catch (err) {
      setPendingDelete(null);
      if (err instanceof ApiError && err.statusCode === 400) {
        const category = categories.find((c) => c.id === categoryId);
        if (category) {
          queuedReplacement.current = {
            categoryId,
            categoryName: category.name,
            type: category.type,
          };
          return;
        }
      }
      setError("Algo deu errado. Tente novamente.");
    } finally {
      setDeleting(false);
    }
  };

  const expenseCategories = categories.filter((c) => c.type === "EXPENSE");
  const incomeCategories = categories.filter((c) => c.type === "INCOME");
  const replacementOptions = replacementPrompt
    ? categories.filter(
        (c) => c.type === replacementPrompt.type && c.id !== replacementPrompt.categoryId,
      )
    : [];

  return (
    <ScrollScreen
      title="Categorias"
      onBack={() => navigation.goBack()}
      actions={
        <IconButton
          testID="add-category-button"
          icon="add"
          variant="soft"
          tone="primary"
          accessibilityLabel="Nova categoria"
          onPress={() => navigation.navigate("CategoryForm", undefined)}
        />
      }
    >
      {error ? <InlineNotice tone="danger" message={error} style={styles.error} /> : null}

      {loading && categories.length === 0 ? (
        <View style={styles.sections} accessibilityLabel="Carregando categorias">
          <Skeleton height={220} radius="lg" />
          <Skeleton height={150} radius="lg" />
        </View>
      ) : (
        <View style={styles.sections}>
          <CategorySection
            title="Despesas"
            categories={expenseCategories}
            onEdit={(category) => navigation.navigate("CategoryForm", { category })}
            onDelete={setPendingDelete}
          />
          <CategorySection
            title="Receitas"
            categories={incomeCategories}
            onEdit={(category) => navigation.navigate("CategoryForm", { category })}
            onDelete={setPendingDelete}
          />
        </View>
      )}

      <ConfirmSheet
        visible={pendingDelete !== null}
        title={pendingDelete ? `Excluir a categoria "${pendingDelete.name}"?` : ""}
        message="Se ela estiver em uso, você escolhe para onde vão os lançamentos dela."
        preview={
          pendingDelete ? (
            <View style={styles.preview}>
              <IconBadge
                icon={pendingDelete.icon as IconName}
                color={pendingDelete.color}
                size={40}
              />
              <Text variant="bodyStrong">{pendingDelete.name}</Text>
            </View>
          ) : undefined
        }
        confirmLabel="Excluir categoria"
        busy={deleting}
        onConfirm={() => {
          if (pendingDelete) void performDelete(pendingDelete.id);
        }}
        onClose={() => setPendingDelete(null)}
        onDismissed={() => {
          if (!queuedReplacement.current) return;
          setReplacementPrompt(queuedReplacement.current);
          queuedReplacement.current = null;
        }}
      />

      <PaperSheet
        testID="replacement-prompt"
        visible={replacementPrompt !== null}
        title="Categoria em uso"
        onClose={() => setReplacementPrompt(null)}
      >
        <Text variant="callout" tone="muted">
          &quot;{replacementPrompt?.categoryName}&quot; está em uso. Escolha uma categoria para
          substituir as transações:
        </Text>
        <View style={styles.options}>
          {replacementOptions.map((option) => (
            <Touchable
              key={option.id}
              testID={`replacement-option-${option.id}`}
              feedback="row"
              accessibilityRole="button"
              accessibilityLabel={`Mover para ${option.name}`}
              disabled={deleting}
              onPress={() => {
                if (replacementPrompt) void performDelete(replacementPrompt.categoryId, option.id);
              }}
              style={styles.option}
            >
              <IconBadge icon={option.icon as IconName} color={option.color} size={40} />
              <Text variant="bodyStrong" style={styles.flex}>
                {option.name}
              </Text>
            </Touchable>
          ))}
        </View>
        <Button
          testID="cancel-replacement"
          label="Cancelar"
          variant="ghost"
          onPress={() => setReplacementPrompt(null)}
        />
      </PaperSheet>
    </ScrollScreen>
  );
}

interface CategorySectionProps {
  title: string;
  categories: Category[];
  onEdit: (category: Category) => void;
  onDelete: (category: Category) => void;
}

function CategorySection({ title, categories, onEdit, onDelete }: CategorySectionProps) {
  const { colors } = useTheme();
  return (
    <View style={styles.section}>
      <Text variant="title2" accessibilityRole="header">
        {title}
      </Text>
      <Card padded={false}>
        {categories.length === 0 ? (
          <Text variant="callout" tone="muted" style={styles.empty}>
            Nenhuma categoria ainda.
          </Text>
        ) : (
          categories.map((category, index) => (
            <View
              key={category.id}
              testID={`category-row-${category.id}`}
              style={[
                styles.row,
                index > 0 && {
                  borderTopWidth: StyleSheet.hairlineWidth * 2,
                  borderTopColor: colors.border,
                },
              ]}
            >
              <IconBadge icon={category.icon as IconName} color={category.color} size={42} />
              <Text variant="bodyStrong" style={styles.flex} numberOfLines={1}>
                {category.name}
              </Text>
              <IconButton
                testID={`edit-category-${category.id}`}
                icon="pencil-outline"
                accessibilityLabel={`Editar ${category.name}`}
                onPress={() => onEdit(category)}
              />
              <IconButton
                testID={`delete-category-${category.id}`}
                icon="trash-outline"
                tone="danger"
                accessibilityLabel={`Excluir ${category.name}`}
                onPress={() => onDelete(category)}
              />
            </View>
          ))
        )}
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  error: {
    marginBottom: space.lg,
  },
  sections: {
    gap: space["2xl"],
  },
  section: {
    gap: space.md,
  },
  empty: {
    padding: space.lg,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.sm,
    paddingLeft: space.lg,
    paddingRight: space.xs,
    paddingVertical: space.xs,
    minHeight: 64,
  },
  preview: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
    padding: space.lg,
  },
  options: {
    gap: space.xs,
  },
  option: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
    padding: space.sm,
    borderRadius: radius.md,
  },
});
