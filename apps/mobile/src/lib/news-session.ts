import { create } from "zustand";

// Legacy shows the newest unread entry once per visit: "Fechar" doesn't
// record anything, but the popup waits for the next time the app is
// opened. In memory only (a new app process = a new visit), per user.
interface NewsSessionState {
  shownFor: string | null;
  markShown: (userId: string) => void;
}

export const useNewsSession = create<NewsSessionState>((set) => ({
  shownFor: null,
  markShown: (userId) => set({ shownFor: userId }),
}));
