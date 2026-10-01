import type { ChangelogUnread } from "@mony/shared-types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { memo, useEffect, useState } from "react";

import { NewsSheet } from "../../components/domain";
import { apiFetch } from "../../lib/api-client";
import { useAuthStore } from "../../lib/auth-store";
import { NEWS_KEY, NEWS_UNREAD_KEY } from "../../lib/changelog-display";
import { useNewsSession } from "../../lib/news-session";
import { useScreenFocused } from "../../lib/use-screen-focused";

// Legacy's dashboard popup: once per visit (app open), the newest unread
// "Novidade" opens by itself. "Fechar" records nothing (it shows again next
// time); "Marcar como lida" records it. Checked once per session, found or
// not, and only while Início is on screen: a later refetch (an admin
// publishing, a read in Novidades) never pops it over another screen.
export const StartupNews = memo(function StartupNews() {
  const queryClient = useQueryClient();
  const userId = useAuthStore((state) => state.user?.id);
  const checkedFor = useNewsSession((state) => state.shownFor);
  const markChecked = useNewsSession((state) => state.markShown);
  const focused = useScreenFocused();
  const [shown, setShown] = useState<ChangelogUnread | null>(null);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const due = !!userId && checkedFor !== userId;

  const unread = useQuery({
    queryKey: NEWS_UNREAD_KEY,
    queryFn: () => apiFetch<ChangelogUnread>("/changelog/unread"),
    enabled: due,
  });

  useEffect(() => {
    if (!due || !focused || !userId || !unread.data) return;
    markChecked(userId);
    if (unread.data.entry) {
      setShown(unread.data);
      setOpen(true);
    }
  }, [due, focused, userId, unread.data, markChecked]);

  const markRead = useMutation({
    mutationFn: (id: string) => apiFetch(`/changelog/${id}/read`, { method: "POST" }),
    onMutate: () => setError(null),
    onSuccess: () => {
      setOpen(false);
      void queryClient.invalidateQueries({ queryKey: NEWS_KEY });
    },
    onError: () => setError("Não deu para marcar como lida. Tente de novo."),
  });

  const entry = shown?.entry ?? null;
  return (
    <NewsSheet
      testID="startup-news"
      visible={open}
      entry={entry}
      unreadCount={shown?.total ?? 0}
      onMarkRead={entry ? () => markRead.mutate(entry.id) : undefined}
      marking={markRead.isPending}
      error={error}
      onClose={() => {
        setOpen(false);
        setError(null);
      }}
    />
  );
});
