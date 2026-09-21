import { Ionicons } from "@expo/vector-icons";
import { formatCurrency, type Transaction, type TransactionStatus } from "@mony/shared-types";
import { color, radius, size as sizeTokens, spacing } from "@mony/ui-tokens";
import { useNavigation } from "@react-navigation/native";
import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, FlatList, StyleSheet, TouchableOpacity, View } from "react-native";

import { AppHeader, Button, Screen, SegmentedToggle, Text, TextField } from "../../components/ui";
import { apiFetch } from "../../lib/api-client";
import type { AppStackNavigation } from "../../navigation/RootNavigator";

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

const PER_PAGE = 20;
const SEARCH_DEBOUNCE_MS = 300;

export function TransactionsListScreen() {
  const navigation = useNavigation<AppStackNavigation>();
  const queryClient = useQueryClient();
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("ALL");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Debounced so typing doesn't fire a request (and reset the whole
  // infinite list) on every keystroke.
  useEffect(() => {
    const timer = setTimeout(() => setSearch(searchInput), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isRefetching,
    isError,
    refetch,
  } = useInfiniteQuery({
      queryKey: ["transactions", { typeFilter, search }],
      queryFn: async ({ pageParam }) => {
        const params = new URLSearchParams({
          page: String(pageParam),
          perPage: String(PER_PAGE),
        });
        if (typeFilter !== "ALL") params.set("type", typeFilter);
        if (search) params.set("search", search);
        return apiFetch<PaginatedTransactions>(`/transactions?${params.toString()}`);
      },
      initialPageParam: 1,
      getNextPageParam: (lastPage) =>
        lastPage.page * lastPage.perPage < lastPage.total ? lastPage.page + 1 : undefined,
    });

  const transactions = data?.pages.flatMap((page) => page.items) ?? [];
  const selectionMode = selectedIds.size > 0;

  const toggleSelected = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleToggleStatus = async (transaction: Transaction) => {
    if (transaction.type !== "EXPENSE") return;
    const nextStatus: TransactionStatus = transaction.status === "PAID" ? "PENDING" : "PAID";
    try {
      await apiFetch(`/transactions/${transaction.id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status: nextStatus }),
      });
      await queryClient.invalidateQueries({ queryKey: ["transactions"] });
    } catch {
      // Best-effort — the row just doesn't update, user can retry the tap.
    }
  };

  const performDelete = async (ids: string[]) => {
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
      await queryClient.invalidateQueries({ queryKey: ["transactions"] });
    } catch {
      Alert.alert("Erro", "Não foi possível excluir. Tente novamente.");
    }
  };

  const confirmDelete = (ids: string[]) => {
    Alert.alert(
      "Excluir transações",
      ids.length === 1 ? "Excluir esta transação?" : `Excluir ${ids.length} transações?`,
      [
        { text: "Cancelar", style: "cancel" },
        { text: "Excluir", style: "destructive", onPress: () => performDelete(ids) },
      ],
    );
  };

  return (
    <Screen scrollable={false}>
      <AppHeader
        title="Transações"
        rightAccessory={
          selectionMode ? (
            <TouchableOpacity
              testID="cancel-selection"
              accessibilityRole="button"
              hitSlop={8}
              onPress={() => setSelectedIds(new Set())}
            >
              <Text variant="bodyStrong" color={color.primary}>
                Cancelar
              </Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              testID="add-transaction-button"
              accessibilityRole="button"
              hitSlop={8}
              onPress={() => navigation.navigate("TransactionForm", undefined)}
            >
              <Ionicons name="add-circle-outline" size={sizeTokens.iconLg} color={color.primary} />
            </TouchableOpacity>
          )
        }
      />

      {selectionMode ? (
        <View style={styles.selectionBar} testID="selection-bar">
          <Text variant="bodyStrong">{selectedIds.size} selecionada(s)</Text>
          <Button
            testID="bulk-delete-button"
            label="Excluir selecionadas"
            variant="secondary"
            onPress={() => confirmDelete([...selectedIds])}
          />
        </View>
      ) : (
        <View style={styles.filters}>
          <SegmentedToggle
            testID="type-filter"
            options={[...TYPE_FILTER_OPTIONS]}
            value={typeFilter}
            onChange={setTypeFilter}
          />
          <TextField
            testID="search-input"
            label="Buscar"
            value={searchInput}
            onChangeText={setSearchInput}
            placeholder="Descrição..."
          />
        </View>
      )}

      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={color.primary} />
        </View>
      ) : isError ? (
        <View style={styles.centered}>
          <Text variant="caption" color={color.danger}>
            Algo deu errado. Tente novamente.
          </Text>
        </View>
      ) : transactions.length === 0 ? (
        <View style={styles.centered}>
          <Text variant="caption" color={color.textSecondary}>
            Nenhuma transação encontrada.
          </Text>
        </View>
      ) : (
        <FlatList
          testID="transactions-list"
          data={transactions}
          keyExtractor={(item) => item.id}
          onEndReachedThreshold={0.4}
          onEndReached={() => {
            if (hasNextPage && !isFetchingNextPage) fetchNextPage();
          }}
          onRefresh={refetch}
          refreshing={isRefetching}
          ListFooterComponent={
            isFetchingNextPage ? <ActivityIndicator color={color.primary} /> : null
          }
          renderItem={({ item }) => (
            <TransactionRow
              transaction={item}
              selected={selectedIds.has(item.id)}
              selectionMode={selectionMode}
              onPress={() =>
                selectionMode
                  ? toggleSelected(item.id)
                  : navigation.navigate("TransactionForm", { transaction: item })
              }
              onLongPress={() => toggleSelected(item.id)}
              onToggleStatus={() => handleToggleStatus(item)}
              onDelete={() => confirmDelete([item.id])}
            />
          )}
        />
      )}
    </Screen>
  );
}

interface TransactionRowProps {
  transaction: Transaction;
  selected: boolean;
  selectionMode: boolean;
  onPress: () => void;
  onLongPress: () => void;
  onToggleStatus: () => void;
  onDelete: () => void;
}

function TransactionRow({
  transaction,
  selected,
  selectionMode,
  onPress,
  onLongPress,
  onToggleStatus,
  onDelete,
}: TransactionRowProps) {
  const isExpense = transaction.type === "EXPENSE";
  const amountColor = transaction.type === "INCOME" ? color.success : color.textPrimary;

  return (
    <TouchableOpacity
      testID={`transaction-row-${transaction.id}`}
      accessibilityState={{ selected }}
      style={[styles.row, selected && styles.rowSelected]}
      onPress={onPress}
      onLongPress={onLongPress}
    >
      {selectionMode && (
        <Ionicons
          name={selected ? "checkbox" : "square-outline"}
          size={sizeTokens.iconMd}
          color={color.primary}
        />
      )}
      <View style={styles.rowMain}>
        <Text variant="bodyStrong">{transaction.description}</Text>
        <Text variant="caption" color={color.textSecondary}>
          {transaction.date}
        </Text>
      </View>
      <Text variant="bodyStrong" color={amountColor}>
        {formatCurrency(transaction.amount)}
      </Text>
      {!selectionMode && isExpense && (
        <TouchableOpacity
          testID={`toggle-status-${transaction.id}`}
          accessibilityRole="button"
          accessibilityLabel={
            transaction.status === "PAID" ? "Marcar como pendente" : "Marcar como pago"
          }
          style={[
            styles.statusBadge,
            transaction.status === "PAID" ? styles.statusPaid : styles.statusPending,
          ]}
          onPress={onToggleStatus}
        >
          <Text
            variant="caption"
            color={transaction.status === "PAID" ? color.success : color.warning}
          >
            {transaction.status === "PAID" ? "Pago" : "Pendente"}
          </Text>
        </TouchableOpacity>
      )}
      {!selectionMode && (
        <TouchableOpacity
          testID={`delete-transaction-${transaction.id}`}
          accessibilityRole="button"
          accessibilityLabel="Excluir transação"
          hitSlop={8}
          onPress={onDelete}
        >
          <Ionicons name="trash-outline" size={sizeTokens.iconSm} color={color.danger} />
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  filters: {
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  selectionBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.md,
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: color.border,
  },
  rowSelected: {
    backgroundColor: color.primaryMuted,
  },
  rowMain: {
    flex: 1,
    gap: spacing.xxs,
  },
  statusBadge: {
    borderRadius: radius.sm,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  statusPaid: {
    backgroundColor: color.successMuted,
  },
  statusPending: {
    backgroundColor: color.warningMuted,
  },
});
