import type { Category, Transaction, TransactionStatus } from "@mony/shared-types";
import { useNavigation } from "@react-navigation/native";
import {
  keepPreviousData,
  useInfiniteQuery,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { memo, useCallback, useEffect, useMemo, useState } from "react";
import {
  RefreshControl,
  SectionList,
  StyleSheet,
  View,
  type SectionListRenderItem,
} from "react-native";
import Animated from "react-native-reanimated";

import { NotebookSwitch, TransactionItem } from "../../components/domain";
import {
  Button,
  ConfirmSheet,
  EmptyState,
  ErrorState,
  IconButton,
  MarkLoader,
  ScreenBackground,
  SegmentedControl,
  Skeleton,
  Text,
  TextField,
  TopBar,
  useBottomClearance,
  useScreenInsets,
  useScrollHeader,
} from "../../components/ui";
import { apiFetch } from "../../lib/api-client";
import { DEBT_RELATED_QUERY_KEYS } from "../../lib/debt-display";
import { MINUS, formatMoney, toCents } from "../../lib/money-display";
import { useToastStore } from "../../lib/toast-store";
import { useRefetchOnFocus } from "../../lib/use-refetch-on-focus";
import type { MainTabNavigation } from "../../navigation/RootNavigator";
import { layout, radius, space, useTheme } from "../../theme";

const TYPE_FILTER_OPTIONS = [
  { value: "ALL", label: "Todos" },
  { value: "EXPENSE", label: "Despesas" },
  { value: "INCOME", label: "Receitas" },
] as const;

type TypeFilter = (typeof TYPE_FILTER_OPTIONS)[number]["value"];

interface PaginatedTransactions {
  items: Transaction[];
  total: number;
  page: number;
  perPage: number;
}

interface DaySection {
  // Stable section key (the date): without it SectionList keys cells by
  // section index, and a new "Hoje" section would remount every row.
  key: string;
  date: string;
  title: string;
  total: number;
  data: Transaction[];
}

const PER_PAGE = 20;
const SEARCH_DEBOUNCE_MS = 300;
// Category names/colors change rarely; mutations invalidate ["categories"].
const CATEGORIES_STALE_MS = 10 * 60 * 1000;
const MONTHS = [
  "janeiro",
  "fevereiro",
  "março",
  "abril",
  "maio",
  "junho",
  "julho",
  "agosto",
  "setembro",
  "outubro",
  "novembro",
  "dezembro",
];

const AnimatedSectionList = Animated.createAnimatedComponent(SectionList<Transaction, DaySection>);

function localISO(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

// "Hoje", "Ontem", "22 de maio" (with the year when it isn't this one).
function dayTitle(iso: string, now = new Date()): string {
  const today = localISO(now);
  const yesterdayDate = new Date(now);
  yesterdayDate.setDate(now.getDate() - 1);
  if (iso === today) return "Hoje";
  if (iso === localISO(yesterdayDate)) return "Ontem";
  const [year, month, day] = iso.split("-").map(Number);
  const label = `${day} de ${MONTHS[(month ?? 1) - 1]}`;
  return year === now.getFullYear() ? label : `${label} de ${year}`;
}

// The API already sorts by date — group consecutive runs into days.
function groupByDay(items: Transaction[]): DaySection[] {
  const sections: DaySection[] = [];
  for (const item of items) {
    const signed = (item.type === "INCOME" ? 1 : -1) * toCents(item.amount);
    const last = sections[sections.length - 1];
    if (last && last.date === item.date) {
      last.data.push(item);
      last.total += signed;
    } else {
      sections.push({
        key: item.date,
        date: item.date,
        title: dayTitle(item.date),
        total: signed,
        data: [item],
      });
    }
  }
  return sections;
}

function signedTotal(cents: number): string {
  return `${cents >= 0 ? "+" : MINUS} ${formatMoney(Math.abs(cents) / 100)}`;
}

const keyExtractor = (item: Transaction) => item.id;

function renderSectionHeader({ section }: { section: DaySection }) {
  return (
    <View style={styles.dayHeader} accessibilityRole="header">
      <Text variant="headline" style={styles.flex}>
        {section.title}
      </Text>
      <Text variant="footnote" tone="muted" style={styles.tabular}>
        {signedTotal(section.total)}
      </Text>
    </View>
  );
}

// Lançamentos (design/telas.md §2): the reference's transaction list —
// type filter in a pill, search, and the entries grouped by day as white
// card rows. Long press selects several; swipe left deletes one.
export function TransactionsListScreen() {
  const navigation = useNavigation<MainTabNavigation>();
  const queryClient = useQueryClient();
  const { colors, elevation } = useTheme();
  const { scrollY, onScroll } = useScrollHeader();
  const insets = useScreenInsets();
  const bottom = useBottomClearance(space["6xl"] + space["2xl"]);
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("ALL");
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [pendingDelete, setPendingDelete] = useState<string[] | null>(null);
  const [deleting, setDeleting] = useState(false);

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isRefetching,
    isError,
    isPlaceholderData,
    refetch,
  } = useInfiniteQuery({
    queryKey: ["transactions", { typeFilter, search }],
    queryFn: async ({ pageParam }) => {
      const params = new URLSearchParams({ page: String(pageParam), perPage: String(PER_PAGE) });
      if (typeFilter !== "ALL") params.set("type", typeFilter);
      if (search) params.set("search", search);
      return apiFetch<PaginatedTransactions>(`/transactions?${params.toString()}`);
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage.page * lastPage.perPage < lastPage.total ? lastPage.page + 1 : undefined,
    // Keep the current rows on screen (dimmed) while a new filter/search
    // loads, instead of flashing the skeleton.
    placeholderData: keepPreviousData,
  });
  useRefetchOnFocus(refetch);

  // Category names/icons/colors for the rows' badges.
  const { data: categoryList } = useQuery({
    queryKey: ["categories"],
    queryFn: () => apiFetch<Category[]>("/categories"),
    staleTime: CATEGORIES_STALE_MS,
  });
  const categories = useMemo(() => {
    const map = new Map<string, Category>();
    if (Array.isArray(categoryList))
      for (const category of categoryList) map.set(category.id, category);
    return map;
  }, [categoryList]);

  const transactions = useMemo(() => data?.pages.flatMap((page) => page.items) ?? [], [data]);
  const sections = useMemo(() => groupByDay(transactions), [transactions]);
  const selectionMode = selectedIds.size > 0;
  const selectedTotal = transactions
    .filter((item) => selectedIds.has(item.id))
    .reduce((sum, item) => sum + (item.type === "INCOME" ? 1 : -1) * toCents(item.amount), 0);

  const toggleSelected = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);
  const openTransaction = useCallback(
    (transaction: Transaction) => navigation.navigate("TransactionForm", { transaction }),
    [navigation],
  );
  const requestDelete = useCallback((id: string) => setPendingDelete([id]), []);

  // A debt installment's transaction pays/unpays (status toggle) or
  // unlinks (delete) that installment server-side, so debt screens and
  // dashboard totals need to refetch too, not just this list.
  const invalidateTransactionDependents = useCallback(
    () =>
      Promise.all(
        DEBT_RELATED_QUERY_KEYS.map((queryKey) => queryClient.invalidateQueries({ queryKey })),
      ),
    [queryClient],
  );

  const handleToggleStatus = useCallback(
    async (transaction: Transaction) => {
      if (transaction.type !== "EXPENSE") return;
      const nextStatus: TransactionStatus = transaction.status === "PAID" ? "PENDING" : "PAID";
      try {
        await apiFetch(`/transactions/${transaction.id}/status`, {
          method: "PATCH",
          body: JSON.stringify({ status: nextStatus }),
        });
        await invalidateTransactionDependents();
      } catch {
        // Best-effort — the row just doesn't update, user can retry the tap.
      }
    },
    [invalidateTransactionDependents],
  );
  const toggleStatus = useCallback(
    (transaction: Transaction) => void handleToggleStatus(transaction),
    [handleToggleStatus],
  );

  const performDelete = async () => {
    if (!pendingDelete) return;
    const ids = pendingDelete;
    setDeleting(true);
    try {
      if (ids.length === 1) {
        await apiFetch(`/transactions/${ids[0]}`, { method: "DELETE" });
      } else {
        await apiFetch("/transactions/bulk-delete", {
          method: "POST",
          body: JSON.stringify({ ids }),
        });
      }
      setSelectedIds(new Set());
      setPendingDelete(null);
      await invalidateTransactionDependents();
    } catch {
      setPendingDelete(null);
      useToastStore.getState().show("Não foi possível excluir. Tente novamente.");
    } finally {
      setDeleting(false);
    }
  };

  const renderItem = useCallback<SectionListRenderItem<Transaction, DaySection>>(
    ({ item }) => (
      <View style={[styles.item, isPlaceholderData && styles.stale]}>
        <TransactionItem
          transaction={item}
          category={categories.get(item.categoryId)}
          selected={selectedIds.has(item.id)}
          selectionMode={selectionMode}
          onOpen={openTransaction}
          onToggleSelect={toggleSelected}
          onToggleStatus={toggleStatus}
          onRequestDelete={requestDelete}
        />
      </View>
    ),
    [
      categories,
      selectedIds,
      selectionMode,
      isPlaceholderData,
      openTransaction,
      toggleSelected,
      toggleStatus,
      requestDelete,
    ],
  );

  const pendingItems = transactions.filter((item) => pendingDelete?.includes(item.id));
  const pendingTotal = pendingItems.reduce(
    (sum, item) => sum + (item.type === "INCOME" ? 1 : -1) * toCents(item.amount),
    0,
  );
  const first = pendingItems[0];

  const empty = !isLoading && !isError && transactions.length === 0;
  const listHeader = useMemo(
    () => (
      <>
        <ListFilters typeFilter={typeFilter} onTypeFilter={setTypeFilter} onSearch={setSearch} />
        {isLoading ? (
          <View style={styles.loading} accessibilityLabel="Carregando lançamentos">
            <Skeleton width={90} height={14} />
            {[0, 1, 2, 3].map((index) => (
              <Skeleton key={index} height={72} radius="lg" />
            ))}
          </View>
        ) : isError ? (
          <ErrorState onRetry={() => void refetch()} />
        ) : empty ? (
          search || typeFilter !== "ALL" ? (
            <EmptyState
              compact
              icon="search-outline"
              title="Nenhum lançamento encontrado."
              message={search ? `Nada com "${search}" por aqui.` : "Nada deste tipo por enquanto."}
            />
          ) : (
            <EmptyState
              image="emptyTransactions"
              icon="receipt-outline"
              title="Nenhum lançamento por aqui ainda."
              message="Toque no + para registrar o primeiro. O Mony faz as contas."
              action={{
                label: "Novo lançamento",
                onPress: () => navigation.navigate("TransactionForm", undefined),
              }}
            />
          )
        ) : null}
      </>
    ),
    [typeFilter, isLoading, isError, empty, search, refetch, navigation],
  );

  const listFooter = useMemo(
    () =>
      isFetchingNextPage ? (
        <View style={styles.footer}>
          <MarkLoader color={colors.primary} accessibilityLabel="Carregando mais lançamentos" />
        </View>
      ) : null,
    [isFetchingNextPage, colors.primary],
  );

  const refreshing = isRefetching && !isFetchingNextPage;
  const refreshControl = useMemo(
    () => (
      <RefreshControl
        refreshing={refreshing}
        onRefresh={() => void refetch()}
        tintColor={colors.primary}
        colors={[colors.primary]}
        progressViewOffset={insets.paddingTop}
      />
    ),
    [refreshing, refetch, colors.primary, insets.paddingTop],
  );

  const contentContainerStyle = useMemo(
    () => [insets, styles.content, { paddingBottom: bottom }],
    [insets, bottom],
  );

  const onEndReached = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) void fetchNextPage();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const showRows = !isLoading && !isError;

  return (
    <View style={[styles.flex, { backgroundColor: colors.background }]}>
      <ScreenBackground />
      <AnimatedSectionList
        testID="transactions-list"
        sections={showRows ? sections : []}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        renderSectionHeader={renderSectionHeader}
        stickySectionHeadersEnabled={false}
        ListHeaderComponent={listHeader}
        ListFooterComponent={listFooter}
        onEndReachedThreshold={0.4}
        onEndReached={onEndReached}
        refreshControl={refreshControl}
        onScroll={onScroll}
        scrollEventThrottle={16}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={contentContainerStyle}
      />

      <TopBar
        scrollY={scrollY}
        threshold={8}
        title="Lançamentos"
        leading={
          selectionMode ? (
            <IconButton
              testID="cancel-selection"
              icon="close"
              variant="soft"
              accessibilityLabel="Cancelar seleção"
              onPress={() => setSelectedIds(new Set())}
            />
          ) : null
        }
        actions={
          selectionMode ? null : (
            <IconButton
              testID="add-transaction-button"
              icon="add"
              variant="soft"
              tone="primary"
              accessibilityLabel="Novo lançamento"
              onPress={() => navigation.navigate("TransactionForm", undefined)}
            />
          )
        }
      />

      {selectionMode ? (
        <View
          testID="selection-bar"
          accessibilityLiveRegion="polite"
          style={[
            styles.selectionBar,
            { backgroundColor: colors.surface, bottom: selectionBarBottom(bottom) },
            elevation("lg"),
          ]}
        >
          <View style={styles.flex}>
            <Text variant="bodyStrong">
              {selectedIds.size} {selectedIds.size === 1 ? "selecionado" : "selecionados"}
            </Text>
            <Text variant="footnote" tone="muted" style={styles.tabular}>
              {signedTotal(selectedTotal)}
            </Text>
          </View>
          <Button
            testID="bulk-delete-button"
            label="Excluir"
            leftIcon="trash-outline"
            variant="danger"
            size="sm"
            fullWidth={false}
            onPress={() => setPendingDelete([...selectedIds])}
          />
        </View>
      ) : null}

      <ConfirmSheet
        visible={pendingDelete !== null}
        title={
          pendingDelete && pendingDelete.length > 1
            ? `Excluir ${pendingDelete.length} lançamentos?`
            : "Excluir este lançamento?"
        }
        message={
          pendingDelete && pendingDelete.length > 1
            ? `Somam ${signedTotal(pendingTotal)} e saem das somas do período.`
            : "Ele sai da lista e das somas do período."
        }
        preview={
          pendingDelete?.length === 1 && first ? (
            <TransactionItem
              transaction={first}
              category={categories.get(first.categoryId)}
              compact
            />
          ) : undefined
        }
        confirmLabel={
          pendingDelete && pendingDelete.length > 1
            ? `Excluir ${pendingDelete.length} lançamentos`
            : "Excluir lançamento"
        }
        busy={deleting}
        onConfirm={() => void performDelete()}
        onClose={() => setPendingDelete(null)}
      />
    </View>
  );
}

interface ListFiltersProps {
  typeFilter: TypeFilter;
  onTypeFilter: (value: TypeFilter) => void;
  // Called with the debounced search text.
  onSearch: (value: string) => void;
}

// Notebook, type filter and search. The search text lives here (with its
// debounce), so typing re-renders only this header, not the whole list.
const ListFilters = memo(function ListFilters({
  typeFilter,
  onTypeFilter,
  onSearch,
}: ListFiltersProps) {
  const [input, setInput] = useState("");

  // Debounced so typing doesn't fire a request (and reset the whole
  // infinite list) on every keystroke.
  useEffect(() => {
    const timer = setTimeout(() => onSearch(input), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [input, onSearch]);

  return (
    <View style={styles.header}>
      <View style={styles.headerRow}>
        <Text variant="subhead" tone="muted" style={styles.flex}>
          Caderno
        </Text>
        <NotebookSwitch />
      </View>
      <SegmentedControl
        testID="type-filter"
        accessibilityLabel="Tipo de lançamento"
        options={[...TYPE_FILTER_OPTIONS]}
        value={typeFilter}
        onChange={onTypeFilter}
      />
      <TextField
        testID="search-input"
        label="Buscar"
        leftIcon="search-outline"
        value={input}
        onChangeText={setInput}
        placeholder="Buscar pela descrição"
        returnKeyType="search"
      />
    </View>
  );
});

// The selection bar floats just above the tab bar.
function selectionBarBottom(listBottom: number): number {
  return Math.max(space.lg, listBottom - space["6xl"] - space.md);
}

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
    marginBottom: space.md,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
  },
  loading: {
    gap: space.md,
    marginTop: space.lg,
  },
  dayHeader: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: space.md,
    paddingTop: space.xl,
    paddingBottom: space.sm,
  },
  tabular: {
    fontVariant: ["tabular-nums"],
  },
  item: {
    marginBottom: space.sm + 2,
  },
  stale: {
    opacity: 0.5,
  },
  footer: {
    alignItems: "center",
    paddingVertical: space.xl,
  },
  selectionBar: {
    position: "absolute",
    left: layout.screenPadding,
    right: layout.screenPadding,
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
    paddingVertical: space.md,
    paddingHorizontal: space.lg,
    borderRadius: radius.lg,
  },
});
