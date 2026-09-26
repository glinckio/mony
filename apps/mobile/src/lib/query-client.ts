import { QueryClient } from "@tanstack/react-query";

import { useAuthStore } from "./auth-store";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
    },
  },
});

// LGPD: the cache holds the signed-in user's financial data. Drop it
// whenever the session's user changes (logout, a failed refresh, another
// account) so the next session never sees it, not even for a frame.
// Keyed on the user id, so a silent token refresh keeps the cache.
let cachedUserId = useAuthStore.getState().user?.id ?? null;
useAuthStore.subscribe((state) => {
  const userId = state.user?.id ?? null;
  if (userId === cachedUserId) return;
  cachedUserId = userId;
  queryClient.clear();
});
