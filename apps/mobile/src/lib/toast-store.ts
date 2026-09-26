import { create } from "zustand";

export type ToastTone = "neutral" | "success" | "warning" | "danger";

export interface ToastReceipt {
  // Signed amount already formatted for display, e.g. "− R$ 212,40".
  amount: string;
  // Category / context line under the amount.
  detail?: string;
}

export interface ToastOptions {
  tone?: ToastTone;
  action?: { label: string; onPress: () => void };
  // The "Lançamento feito" moment renders the toast as a small receipt.
  receipt?: ToastReceipt;
}

interface ToastState extends ToastOptions {
  message: string | null;
  // Bumped on every show() so the same text shown twice re-animates.
  key: number;
  show: (message: string, options?: ToastOptions) => void;
  hide: () => void;
}

// One toast at a time; a new one replaces the current. Mounted once at the
// app root (AppToast) — screens call `useToastStore.getState().show()`.
// Without a tone, a message reads as a failure: that's what every existing
// call site reports.
export const useToastStore = create<ToastState>((set) => ({
  message: null,
  key: 0,
  show: (message, options = {}) =>
    set((state) => ({
      message,
      tone: options.tone ?? "danger",
      action: options.action,
      receipt: options.receipt,
      key: state.key + 1,
    })),
  hide: () => set({ message: null, action: undefined, receipt: undefined }),
}));
