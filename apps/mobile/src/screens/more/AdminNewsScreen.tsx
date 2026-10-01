import type { AdminChangelogEntry } from "@mony/shared-types";
import { useNavigation } from "@react-navigation/native";
import { useQuery } from "@tanstack/react-query";
import { StyleSheet, View } from "react-native";

import { AdminNewsRow } from "../../components/domain";
import { EmptyState, ErrorState, IconButton, ScrollScreen, Skeleton } from "../../components/ui";
import { apiFetch } from "../../lib/api-client";
import { ADMIN_NEWS_KEY } from "../../lib/changelog-display";
import { useRefetchOnFocus } from "../../lib/use-refetch-on-focus";
import type { AppStackNavigation } from "../../navigation/RootNavigator";
import { space } from "../../theme";

// Gerenciar novidades (design/telas.md §31; legacy
// gerenciar_atualizacoes.php), for admins only: every entry, newest
// first, with what users see of it now, readers and author. "+" publishes;
// tapping one edits (or deletes) it.
export function AdminNewsScreen() {
  const navigation = useNavigation<AppStackNavigation>();
  const list = useQuery({
    queryKey: ADMIN_NEWS_KEY,
    queryFn: () => apiFetch<AdminChangelogEntry[]>("/admin/changelog"),
  });
  useRefetchOnFocus(() => {
    if (list.isStale) void list.refetch();
  });
  const newEntry = () => navigation.navigate("NewsForm", undefined);

  return (
    <ScrollScreen
      testID="admin-news-screen"
      title="Gerenciar novidades"
      onBack={() => navigation.goBack()}
      refreshing={list.isRefetching}
      onRefresh={() => void list.refetch()}
      actions={
        <IconButton
          testID="add-news-button"
          icon="add"
          variant="soft"
          tone="primary"
          accessibilityLabel="Nova novidade"
          onPress={newEntry}
        />
      }
    >
      {list.isError && !list.data ? (
        <ErrorState onRetry={() => void list.refetch()} />
      ) : !list.data ? (
        <View style={styles.list}>
          <Skeleton height={112} radius="lg" />
          <Skeleton height={112} radius="lg" />
        </View>
      ) : list.data.length === 0 ? (
        <EmptyState
          testID="admin-news-empty"
          icon="megaphone-outline"
          title="Nenhuma novidade publicada"
          message="Conte aos usuários o que mudou no Mony."
          action={{ label: "Nova novidade", onPress: newEntry, testID: "admin-news-empty-add" }}
        />
      ) : (
        <View style={styles.list}>
          {list.data.map((entry) => (
            <AdminNewsRow
              key={entry.id}
              testID={`admin-news-${entry.id}`}
              entry={entry}
              onPress={() => navigation.navigate("NewsForm", { entry })}
            />
          ))}
        </View>
      )}
    </ScrollScreen>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: space.md,
  },
});
