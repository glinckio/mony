import type { AdminChangelogEntry } from "@mony/shared-types";

import { formatDateDisplay, localTodayISO } from "./date-mask";

// Display rules for "Novidades" (docs/specs/changelog).

export const NEWS_KEY = ["changelog"] as const;
export const NEWS_UNREAD_KEY = ["changelog", "unread"] as const;
export const NEWS_HISTORY_KEY = ["changelog", "history"] as const;
export const ADMIN_NEWS_KEY = ["admin-changelog"] as const;

// An instant as the phone's local day: "30/09/2026".
export const dayOf = (iso: string): string => formatDateDisplay(localTodayISO(new Date(iso)));

export const readLabel = (readAt: string): string => `Lida em ${dayOf(readAt)}`;

// Legacy's "N novas" badge when more than one is waiting.
export const unreadCountLabel = (count: number): string | null =>
  count > 1 ? `${count} novas` : null;

// Legacy's note under the newest one: the others show up next time.
export function moreUnreadNote(unreadCount: number): string | null {
  const more = unreadCount - 1;
  if (more <= 0) return null;
  return more === 1
    ? "Há mais 1 novidade não lida. Ela aparece na próxima vez."
    : `Há mais ${more} novidades não lidas. Elas aparecem na próxima vez.`;
}

// A card's preview: whitespace collapsed, cut at a word, with an ellipsis.
export function excerpt(text: string, max = 140): string {
  const flat = text.replace(/\s+/g, " ").trim();
  if (flat.length <= max) return flat;
  const cut = flat.slice(0, max);
  const lastSpace = cut.lastIndexOf(" ");
  return `${(lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut).trimEnd()}…`;
}

export type AdminNewsState = "active" | "inactive" | "expired";

// What users see of an entry right now: active, expired (past its last
// day, until the daily job deactivates it) or inactive. "Today" is the
// API's: the UTC date, not the phone's.
export function adminNewsState(
  entry: Pick<AdminChangelogEntry, "status" | "expiresAt">,
  today: string = new Date().toISOString().slice(0, 10),
): { state: AdminNewsState; label: string } {
  if (entry.status === "INACTIVE") return { state: "inactive", label: "Inativa" };
  if (entry.expiresAt && entry.expiresAt < today) return { state: "expired", label: "Vencida" };
  return { state: "active", label: "Ativa" };
}

export const readersLabel = (count: number): string =>
  count === 0 ? "Ninguém leu ainda" : count === 1 ? "1 leitura" : `${count} leituras`;
