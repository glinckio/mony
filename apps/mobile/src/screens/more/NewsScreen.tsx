import type { ChangelogEntry, ChangelogList } from "@mony/shared-types";
import { useNavigation } from "@react-navigation/native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { StyleSheet, View } from "react-native";

import { NewsCard, NewsSheet } from "../../components/domain";
import { EmptyState, ErrorState, ScrollScreen, Skeleton } from "../../components/ui";
import { apiFetch } from "../../lib/api-client";
import { NEWS_HISTORY_KEY, NEWS_KEY } from "../../lib/changelog-display";
import { useRefetchOnFocus } from "../../lib/use-refetch-on-focus";
import type { AppStackNavigation } from "../../navigation/RootNavigator";
import { space } from "../../theme";
import { haptic } from "../../theme/haptics";

// Novidades (design/telas.md §30; legacy historico_atualizacoes.php):
// every entry visible to the user, newest first, "Nova" or "Lida em …";
// opening one shows it in full, with "Marcar como lida" while unread.
export function NewsScreen() {
  const navigation = useNavigation<AppStackNavigation>();
  const queryClient = useQueryClient();
  const [openId, setOpenId] = useState<string | null>(null);
  const [markError, setMarkError] = useState<string | null>(null);

  const history = useQuery({
    queryKey: NEWS_HISTORY_KEY,
    queryFn: () => apiFetch<ChangelogList>("/changelog"),
  });
  useRefetchOnFocus(() => {
    if (history.isStale) void history.refetch();
  });
  const entries = history.data?.entries ?? [];
  const open: ChangelogEntry | null = entries.find((entry) => entry.id === openId) ?? null;

  const markRead = useMutation({
    mutationFn: (id: string) => apiFetch(`/changelog/${id}/read`, { method: "POST" }),
    onMutate: () => setMarkError(null),
    // Shown as read at once; the refetch confirms it in the background.
    onSuccess: (_result, id) => {
      haptic.success();
      const readAt = new Date().toISOString();
      queryClient.setQueryData<ChangelogList>(NEWS_HISTORY_KEY, (old) =>
        old
          ? {
              entries: old.entries.map((entry) => (entry.id === id ? { ...entry, readAt } : entry)),
            }
          : old,
      );
      setOpenId(null);
      void queryClient.invalidateQueries({ queryKey: NEWS_KEY });
    },
    // Inside the sheet: a toast would sit behind it.
    onError: () => {
      haptic.error();
      setMarkError("Não deu para marcar como lida. Tente de novo.");
    },
  });

  return (
    <ScrollScreen
      testID="news-screen"
      title="Novidades"
      onBack={() => navigation.goBack()}
      refreshing={history.isRefetching}
      onRefresh={() => void history.refetch()}
    >
      {history.isError && !history.data ? (
        <ErrorState onRetry={() => void history.refetch()} />
      ) : !history.data ? (
        <View style={styles.list}>
          <Skeleton height={132} radius="lg" />
          <Skeleton height={132} radius="lg" />
        </View>
      ) : entries.length === 0 ? (
        <EmptyState
          testID="news-empty"
          icon="megaphone-outline"
          title="Nenhuma novidade por aqui"
          message="Quando o Mony ganhar algo novo, você fica sabendo aqui."
        />
      ) : (
        <View style={styles.list}>
          {entries.map((entry) => (
            <NewsCard
              key={entry.id}
              testID={`news-card-${entry.id}`}
              entry={entry}
              onPress={() => setOpenId(entry.id)}
            />
          ))}
        </View>
      )}

      <NewsSheet
        visible={open !== null}
        entry={open}
        onMarkRead={open && !open.readAt ? () => markRead.mutate(open.id) : undefined}
        marking={markRead.isPending}
        error={markError}
        onClose={() => {
          setOpenId(null);
          setMarkError(null);
        }}
      />
    </ScrollScreen>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: space.md,
  },
});
