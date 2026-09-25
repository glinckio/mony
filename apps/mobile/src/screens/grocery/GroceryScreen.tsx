import { Ionicons } from "@expo/vector-icons";
import {
  formatCurrency,
  type GroceryBudget,
  type GroceryCategory,
  type GroceryItem,
  type GrocerySummary,
} from "@mony/shared-types";
import { color, radius, size as sizeTokens, spacing } from "@mony/ui-tokens";
import { useNavigation } from "@react-navigation/native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { memo, useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  SectionList,
  Share,
  StyleSheet,
  TouchableOpacity,
  View,
  type SectionListRenderItem,
} from "react-native";

import {
  AppHeader,
  Badge,
  IconButton,
  ProgressBar,
  Screen,
  SegmentedToggle,
  Text,
} from "../../components/ui";
import { apiFetch } from "../../lib/api-client";
import {
  GROCERY_CATEGORY_LABELS,
  budgetUsage,
  buildShoppingListMessage,
  formatQuantity,
} from "../../lib/grocery-display";
import { useToastStore } from "../../lib/toast-store";
import type { AppStackNavigation } from "../../navigation/RootNavigator";

import { GroceryBudgetSheet } from "./GroceryBudgetSheet";

type Filter = "ALL" | "MISSING";

const FILTER_OPTIONS: Array<{ value: Filter; label: string }> = [
  { value: "ALL", label: "Todos" },
  { value: "MISSING", label: "Faltando" },
];

interface Section {
  category: GroceryCategory;
  data: GroceryItem[];
}

// Quantity +/- 1 in integer hundredths (1.5 - 1 = 0.5, never below 0).
function steppedQuantity(current: string, delta: 1 | -1): number {
  return Math.max(0, Math.round(Number(current) * 100) + delta * 100) / 100;
}

const keyExtractor = (item: GroceryItem) => item.id;

function renderSectionHeader({ section }: { section: Section }) {
  return (
    <Text variant="bodyStrong" style={styles.sectionTitle}>
      {GROCERY_CATEGORY_LABELS[section.category]}
    </Text>
  );
}

export function GroceryScreen() {
  const navigation = useNavigation<AppStackNavigation>();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<Filter>("ALL");
  const [budgetSheetOpen, setBudgetSheetOpen] = useState(false);

  const itemsQuery = useQuery({
    queryKey: ["grocery", "items"],
    queryFn: () => apiFetch<GroceryItem[]>("/grocery/items"),
  });
  const budgetQuery = useQuery({
    queryKey: ["grocery", "budget"],
    queryFn: () => apiFetch<GroceryBudget>("/grocery/budget"),
  });
  const summaryQuery = useQuery({
    queryKey: ["grocery", "summary"],
    queryFn: () => apiFetch<GrocerySummary>("/grocery/summary"),
  });

  // Quick +/- (legacy `atualizar_quantidade`), optimistic: the tap updates
  // the cached row synchronously and the PATCH carries the resulting
  // absolute quantity. `scope` runs the PATCHes one at a time, in tap
  // order, so rapid taps can't reorder on the server; PATCH responses are
  // NOT written back over the cache (they'd clobber newer taps). On any
  // failure the list is refetched from the server.
  const stepMutation = useMutation({
    scope: { id: "grocery-step" },
    mutationFn: ({ itemId, quantity }: { itemId: string; quantity: number }) =>
      apiFetch<GroceryItem>(`/grocery/items/${itemId}`, {
        method: "PATCH",
        body: JSON.stringify({ currentQuantity: quantity }),
      }),
    // Stop an in-flight list refetch from landing over the optimistic row.
    onMutate: () => queryClient.cancelQueries({ queryKey: ["grocery", "items"] }),
    onError: () => {
      useToastStore.getState().show("Não foi possível atualizar a quantidade.");
      void queryClient.invalidateQueries({ queryKey: ["grocery", "items"] });
    },
    // Not awaited — the summary refreshing must not hold up the next tap.
    onSettled: () => void queryClient.invalidateQueries({ queryKey: ["grocery", "summary"] }),
  });

  const { mutate: step } = stepMutation;

  const onStep = useCallback(
    (itemId: string, delta: 1 | -1) => {
      // Read the latest cached value, not the row's props, so two taps in
      // the same frame still build on each other.
      const items = queryClient.getQueryData<GroceryItem[]>(["grocery", "items"]);
      const current = items?.find((item) => item.id === itemId);
      if (!items || !current) return;
      const quantity = steppedQuantity(current.currentQuantity, delta);
      if (quantity === Number(current.currentQuantity)) return;

      queryClient.setQueryData<GroceryItem[]>(
        ["grocery", "items"],
        items.map((item) =>
          item.id === itemId
            ? {
                ...item,
                currentQuantity: quantity.toFixed(2),
                missing: quantity < Number(item.idealQuantity),
              }
            : item,
        ),
      );
      step({ itemId, quantity });
    },
    [queryClient, step],
  );
  const onEdit = useCallback(
    (item: GroceryItem) => navigation.navigate("GroceryItemForm", { item }),
    [navigation],
  );

  // The API already orders by category, then name — group consecutive runs.
  const sections = useMemo<Section[]>(() => {
    const visible = (itemsQuery.data ?? []).filter((item) => filter === "ALL" || item.missing);
    const grouped: Section[] = [];
    for (const item of visible) {
      const last = grouped[grouped.length - 1];
      if (last && last.category === item.category) last.data.push(item);
      else grouped.push({ category: item.category, data: [item] });
    }
    return grouped;
  }, [itemsQuery.data, filter]);

  // Only once the list and a settled (not refetching) summary are in, so
  // the shared total always matches what the card shows.
  const canShare = !!itemsQuery.data && !!summaryQuery.data && !summaryQuery.isFetching;

  const share = async () => {
    if (!itemsQuery.data || !summaryQuery.data) return;
    if (!itemsQuery.data.some((item) => item.missing)) {
      useToastStore.getState().show("Não há itens faltando para compartilhar.");
      return;
    }
    try {
      await Share.share({
        message: buildShoppingListMessage(
          itemsQuery.data,
          summaryQuery.data.estimatedPurchaseTotal,
        ),
      });
    } catch {
      useToastStore.getState().show("Não foi possível compartilhar. Tente novamente.");
    }
  };

  const renderItem = useCallback<SectionListRenderItem<GroceryItem, Section>>(
    ({ item }) => <GroceryRow item={item} onStep={onStep} onEdit={onEdit} />,
    [onStep, onEdit],
  );

  const isError = itemsQuery.isError || budgetQuery.isError || summaryQuery.isError;
  const budget = budgetQuery.data;
  const summary = summaryQuery.data;

  return (
    <Screen scrollable={false}>
      <AppHeader
        title="Mercado"
        onBack={() => navigation.goBack()}
        rightAccessory={
          <View style={styles.headerActions}>
            <TouchableOpacity
              testID="share-grocery-list"
              accessibilityRole="button"
              accessibilityLabel="Compartilhar lista de compras"
              accessibilityState={{ disabled: !canShare }}
              hitSlop={8}
              disabled={!canShare}
              onPress={share}
            >
              <Ionicons
                name="share-social-outline"
                size={sizeTokens.iconLg}
                color={canShare ? color.primary : color.textDisabled}
              />
            </TouchableOpacity>
            <TouchableOpacity
              testID="add-grocery-item-button"
              accessibilityRole="button"
              accessibilityLabel="Novo item"
              hitSlop={8}
              onPress={() => navigation.navigate("GroceryItemForm", undefined)}
            >
              <Ionicons name="add-circle-outline" size={sizeTokens.iconLg} color={color.primary} />
            </TouchableOpacity>
          </View>
        }
      />

      {isError ? (
        <Text variant="caption" color={color.danger}>
          Algo deu errado. Tente novamente.
        </Text>
      ) : !itemsQuery.data || !budget || !summary ? (
        // Also covers a paused (offline) query, where isLoading is false.
        <View style={styles.centered}>
          <ActivityIndicator color={color.primary} />
        </View>
      ) : (
        <SectionList
          testID="grocery-list"
          sections={sections}
          keyExtractor={keyExtractor}
          stickySectionHeadersEnabled={false}
          contentContainerStyle={styles.listContent}
          ListHeaderComponent={
            <View style={styles.header}>
              <BudgetCard
                budget={budget}
                summary={summary}
                onEdit={() => setBudgetSheetOpen(true)}
              />
              <SegmentedToggle
                testID="grocery-filter"
                options={FILTER_OPTIONS}
                value={filter}
                onChange={setFilter}
              />
            </View>
          }
          ListEmptyComponent={
            <Text variant="caption" color={color.textSecondary}>
              {filter === "MISSING" ? "Nada faltando por aqui." : "Nenhum item ainda."}
            </Text>
          }
          renderSectionHeader={renderSectionHeader}
          renderItem={renderItem}
        />
      )}

      <GroceryBudgetSheet
        visible={budgetSheetOpen}
        currentAmount={budgetQuery.data?.amount ?? null}
        onClose={() => setBudgetSheetOpen(false)}
      />
    </Screen>
  );
}

interface BudgetCardProps {
  budget: GroceryBudget;
  summary: GrocerySummary;
  onEdit: () => void;
}

function BudgetCard({ budget, summary, onEdit }: BudgetCardProps) {
  const amount = budget.amount === null ? null : Number(budget.amount);
  const usage = budgetUsage(amount, Number(summary.estimatedPurchaseTotal));

  return (
    <View style={styles.card} testID="grocery-budget-card">
      <View style={styles.cardHeader}>
        <Text variant="caption">Orçamento mensal</Text>
        <TouchableOpacity
          testID="edit-grocery-budget"
          accessibilityRole="button"
          accessibilityLabel="Definir orçamento"
          hitSlop={8}
          onPress={onEdit}
        >
          <Ionicons name="pencil-outline" size={sizeTokens.iconMd} color={color.primary} />
        </TouchableOpacity>
      </View>
      <Text variant="title" testID="grocery-budget-amount">
        {amount === null ? "Não definido" : formatCurrency(budget.amount!)}
      </Text>
      <View style={styles.cardRow}>
        <Text variant="caption">Estimativa de compra</Text>
        <Text variant="bodyStrong" testID="grocery-estimated-total">
          {formatCurrency(summary.estimatedPurchaseTotal)}
        </Text>
      </View>
      <ProgressBar testID="grocery-budget-progress" percent={usage.percent} tone={usage.tone} />
      {amount !== null && (
        <View style={styles.cardRow}>
          <Text variant="caption">Saldo disponível</Text>
          <Text
            variant="bodyStrong"
            testID="grocery-remaining"
            color={usage.overBudget ? color.danger : color.success}
          >
            {formatCurrency(usage.remaining.toFixed(2))}
          </Text>
        </View>
      )}
      <Text variant="caption" testID="grocery-counts">
        {summary.totalItemCount} {summary.totalItemCount === 1 ? "item" : "itens"} ·{" "}
        {summary.missingItemCount} faltando
      </Text>
    </View>
  );
}

interface GroceryRowProps {
  item: GroceryItem;
  onStep: (itemId: string, delta: 1 | -1) => void;
  onEdit: (item: GroceryItem) => void;
}

// Memoized: a step only re-renders the row whose item object changed.
const GroceryRow = memo(function GroceryRow({ item, onStep, onEdit }: GroceryRowProps) {
  const atZero = Number(item.currentQuantity) <= 0;

  return (
    <View style={styles.row} testID={`grocery-row-${item.id}`}>
      <TouchableOpacity
        style={styles.rowMain}
        accessibilityRole="button"
        accessibilityLabel={`Editar ${item.name}`}
        onPress={() => onEdit(item)}
      >
        <View style={styles.rowTitle}>
          <Text variant="bodyStrong" numberOfLines={1} style={styles.rowName}>
            {item.name}
          </Text>
          {item.missing && (
            <Badge testID={`grocery-missing-${item.id}`} label="Faltando" tone="warning" />
          )}
        </View>
        <Text variant="caption">
          {formatQuantity(item.currentQuantity)} de {formatQuantity(item.idealQuantity)} {item.unit}{" "}
          · {formatCurrency(item.estimatedPrice)}/{item.unit}
        </Text>
      </TouchableOpacity>
      <View style={styles.stepper}>
        <IconButton
          testID={`grocery-decrement-${item.id}`}
          icon="remove"
          accessibilityLabel={`Diminuir ${item.name}`}
          disabled={atZero}
          onPress={() => onStep(item.id, -1)}
        />
        <IconButton
          testID={`grocery-increment-${item.id}`}
          icon="add"
          accessibilityLabel={`Aumentar ${item.name}`}
          onPress={() => onStep(item.id, 1)}
        />
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  listContent: {
    gap: spacing.sm,
    paddingBottom: spacing.lg,
  },
  header: {
    gap: spacing.md,
    marginBottom: spacing.sm,
  },
  card: {
    gap: spacing.sm,
    padding: spacing.md,
    backgroundColor: color.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: color.border,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  cardRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sectionTitle: {
    marginTop: spacing.sm,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    padding: spacing.md,
    backgroundColor: color.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: color.border,
  },
  rowMain: {
    flex: 1,
    gap: spacing.xxs,
  },
  rowTitle: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  rowName: {
    flexShrink: 1,
  },
  stepper: {
    flexDirection: "row",
    gap: spacing.xs,
  },
});
