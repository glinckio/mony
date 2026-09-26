import type {
  GroceryBudget,
  GroceryCategory,
  GroceryItem,
  GrocerySummary,
} from "@mony/shared-types";
import { useNavigation } from "@react-navigation/native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { memo, useCallback, useMemo, useState } from "react";
import {
  RefreshControl,
  SectionList,
  Share,
  StyleSheet,
  View,
  type SectionListRenderItem,
} from "react-native";
import Animated from "react-native-reanimated";

import { PantryItem } from "../../components/domain";
import {
  Card,
  EmptyState,
  ErrorState,
  IconButton,
  ProgressBar,
  ScreenBackground,
  SegmentedControl,
  Skeleton,
  Text,
  TopBar,
  useBottomClearance,
  useScreenInsets,
  useScrollHeader,
} from "../../components/ui";
import { apiFetch } from "../../lib/api-client";
import {
  GROCERY_CATEGORY_LABELS,
  budgetUsage,
  buildShoppingListMessage,
} from "../../lib/grocery-display";
import { formatMoney } from "../../lib/money-display";
import { useToastStore } from "../../lib/toast-store";
import type { AppStackNavigation } from "../../navigation/RootNavigator";
import { layout, space, useTheme } from "../../theme";

import { GroceryBudgetSheet } from "./GroceryBudgetSheet";

type Filter = "ALL" | "MISSING";

const FILTER_OPTIONS: Array<{ value: Filter; label: string }> = [
  { value: "ALL", label: "Todos" },
  { value: "MISSING", label: "Faltando" },
];

interface Section {
  // Stable section key: SectionList otherwise keys cells by section index,
  // so filtering out a whole category would remount the rows after it.
  key: GroceryCategory;
  category: GroceryCategory;
  data: GroceryItem[];
}

const AnimatedSectionList = Animated.createAnimatedComponent(SectionList<GroceryItem, Section>);

// Quantity +/- 1 in integer hundredths (1.5 - 1 = 0.5, never below 0).
function steppedQuantity(current: string, delta: 1 | -1): number {
  return Math.max(0, Math.round(Number(current) * 100) + delta * 100) / 100;
}

const keyExtractor = (item: GroceryItem) => item.id;

function renderSectionHeader({ section }: { section: Section }) {
  return (
    <Text variant="headline" accessibilityRole="header" style={styles.sectionTitle}>
      {GROCERY_CATEGORY_LABELS[section.category]}
    </Text>
  );
}

// Mercado (design/telas.md §12): the month's budget card (like the
// reference's budget screen) — budget, shopping estimate, what's left —
// then the pantry by category, each item a card with its stepper.
export function GroceryScreen() {
  const navigation = useNavigation<AppStackNavigation>();
  const queryClient = useQueryClient();
  const { colors } = useTheme();
  const { scrollY, onScroll } = useScrollHeader();
  const insets = useScreenInsets();
  const bottom = useBottomClearance();
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
      else grouped.push({ key: item.category, category: item.category, data: [item] });
    }
    return grouped;
  }, [itemsQuery.data, filter]);

  // Only once the list and a settled (not refetching) summary are in, so
  // the shared total always matches what the card shows.
  const canShare = !!itemsQuery.data && !!summaryQuery.data && !summaryQuery.isFetching;

  const share = async () => {
    if (!itemsQuery.data || !summaryQuery.data) return;
    if (!itemsQuery.data.some((item) => item.missing)) {
      useToastStore
        .getState()
        .show("Não há itens faltando para compartilhar.", { tone: "neutral" });
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
    ({ item }) => (
      <View style={styles.item}>
        <PantryItem item={item} onStep={onStep} onEdit={onEdit} />
      </View>
    ),
    [onStep, onEdit],
  );

  const isError = itemsQuery.isError || budgetQuery.isError || summaryQuery.isError;
  const budget = budgetQuery.data;
  const summary = summaryQuery.data;
  const ready = !!itemsQuery.data && !!budget && !!summary;
  const { refetch: refetchItems } = itemsQuery;
  const { refetch: refetchBudget } = budgetQuery;
  const { refetch: refetchSummary } = summaryQuery;
  const refetchAll = useCallback(() => {
    void refetchItems();
    void refetchBudget();
    void refetchSummary();
  }, [refetchItems, refetchBudget, refetchSummary]);
  const openBudgetSheet = useCallback(() => setBudgetSheetOpen(true), []);

  const header = ready ? (
    <View style={styles.header}>
      <BudgetCard budget={budget} summary={summary} onEdit={openBudgetSheet} />
      <SegmentedControl
        testID="grocery-filter"
        options={FILTER_OPTIONS}
        value={filter}
        onChange={setFilter}
      />
    </View>
  ) : isError ? (
    <ErrorState onRetry={refetchAll} />
  ) : (
    // Also covers a paused (offline) query, where isLoading is false.
    <View style={styles.loading} accessibilityLabel="Carregando o mercado">
      <Skeleton height={170} radius="lg" />
      <Skeleton height={48} radius="full" />
      {[0, 1, 2].map((index) => (
        <Skeleton key={index} height={84} radius="lg" />
      ))}
    </View>
  );

  const refreshing = itemsQuery.isRefetching;
  const refreshControl = useMemo(
    () => (
      <RefreshControl
        refreshing={refreshing}
        onRefresh={refetchAll}
        tintColor={colors.primary}
        colors={[colors.primary]}
        progressViewOffset={insets.paddingTop}
      />
    ),
    [refreshing, refetchAll, colors.primary, insets.paddingTop],
  );
  const contentContainerStyle = useMemo(
    () => [insets, styles.content, { paddingBottom: bottom }],
    [insets, bottom],
  );

  return (
    <View style={[styles.flex, { backgroundColor: colors.background }]}>
      <ScreenBackground />
      <AnimatedSectionList
        testID="grocery-list"
        sections={ready ? sections : []}
        keyExtractor={keyExtractor}
        stickySectionHeadersEnabled={false}
        ListHeaderComponent={header}
        ListEmptyComponent={
          ready ? (
            filter === "MISSING" ? (
              <EmptyState
                compact
                icon="checkmark-done-outline"
                title="Nada faltando por aqui."
                message="A despensa está em dia."
              />
            ) : (
              <EmptyState
                image="emptyGrocery"
                icon="cart-outline"
                title="Nenhum item ainda."
                message="Cadastre o que a casa usa e o Mony monta a lista do que falta."
                action={{
                  label: "Novo item",
                  onPress: () => navigation.navigate("GroceryItemForm", undefined),
                }}
              />
            )
          ) : null
        }
        renderSectionHeader={renderSectionHeader}
        renderItem={renderItem}
        refreshControl={refreshControl}
        onScroll={onScroll}
        scrollEventThrottle={16}
        contentContainerStyle={contentContainerStyle}
      />

      <TopBar
        scrollY={scrollY}
        threshold={8}
        title="Mercado"
        onBack={() => navigation.goBack()}
        actions={
          <>
            <IconButton
              testID="share-grocery-list"
              icon="share-social-outline"
              variant="soft"
              accessibilityLabel="Compartilhar lista de compras"
              disabled={!canShare}
              onPress={() => void share()}
            />
            <IconButton
              testID="add-grocery-item-button"
              icon="add"
              variant="soft"
              tone="primary"
              accessibilityLabel="Novo item"
              onPress={() => navigation.navigate("GroceryItemForm", undefined)}
            />
          </>
        }
      />

      <GroceryBudgetSheet
        visible={budgetSheetOpen}
        currentAmount={budgetQuery.data?.amount ?? null}
        onClose={() => setBudgetSheetOpen(false)}
      />
    </View>
  );
}

interface BudgetCardProps {
  budget: GroceryBudget;
  summary: GrocerySummary;
  onEdit: () => void;
}

// Memoized: stepping an item re-renders the screen, but the card only
// changes when the budget or the summary does.
const BudgetCard = memo(function BudgetCard({ budget, summary, onEdit }: BudgetCardProps) {
  const { colors } = useTheme();
  const amount = budget.amount === null ? null : Number(budget.amount);
  const usage = budgetUsage(amount, Number(summary.estimatedPurchaseTotal));

  return (
    <Card testID="grocery-budget-card" style={styles.card}>
      <View style={styles.cardTop}>
        <View style={styles.flex}>
          <Text variant="subhead" tone="muted">
            Orçamento do mês
          </Text>
          <Text variant="numeralLarge" testID="grocery-budget-amount">
            {amount === null ? "Não definido" : formatMoney(budget.amount ?? "0")}
          </Text>
        </View>
        <View style={styles.estimate}>
          <Text variant="subhead" tone="muted">
            Estimativa
          </Text>
          <Text variant="numeral" testID="grocery-estimated-total">
            {formatMoney(summary.estimatedPurchaseTotal)}
          </Text>
        </View>
        <IconButton
          testID="edit-grocery-budget"
          icon="pencil"
          variant="soft"
          accessibilityLabel="Definir orçamento"
          onPress={onEdit}
        />
      </View>
      <ProgressBar
        testID="grocery-budget-progress"
        percent={usage.percent}
        tone={usage.tone}
        height={10}
      />
      <View style={styles.cardBottom}>
        {amount !== null ? (
          <Text variant="footnote" tone="muted" style={styles.flex}>
            {/* Spec: the balance is clamped at zero, so over budget reads
                "Saldo disponível R$ 0,00" in danger — never a fake overrun. */}
            Saldo disponível{" "}
            <Text
              variant="subhead"
              inline
              testID="grocery-remaining"
              color={usage.overBudget ? colors.danger : colors.success}
            >
              {formatMoney(usage.remaining)}
            </Text>
          </Text>
        ) : (
          <View style={styles.flex} />
        )}
        <Text variant="footnote" tone="muted" testID="grocery-counts">
          {summary.totalItemCount} {summary.totalItemCount === 1 ? "item" : "itens"} ·{" "}
          {summary.missingItemCount} faltando
        </Text>
      </View>
    </Card>
  );
});

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    width: "100%",
    maxWidth: layout.maxContentWidth,
    alignSelf: "center",
  },
  header: {
    gap: space.lg,
    marginBottom: space.xs,
  },
  loading: {
    gap: space.md,
  },
  card: {
    gap: space.md,
  },
  cardTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: space.md,
  },
  estimate: {
    alignItems: "flex-end",
  },
  cardBottom: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
  },
  sectionTitle: {
    paddingTop: space.xl,
    paddingBottom: space.sm,
  },
  item: {
    marginBottom: space.sm + 2,
  },
});
