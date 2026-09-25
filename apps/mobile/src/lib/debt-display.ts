import type { DebtStatus } from "@mony/shared-types";

import type { BadgeTone } from "../components/ui";

export const DEBT_STATUS_LABELS: Record<DebtStatus, string> = {
  ACTIVE: "Ativa",
  OVERDUE: "Atrasada",
  PAID_OFF: "Quitada",
};

export const DEBT_STATUS_TONES: Record<DebtStatus, BadgeTone> = {
  ACTIVE: "info",
  OVERDUE: "danger",
  PAID_OFF: "success",
};

export function installmentProgressPercent(paid: number, total: number): number {
  return total > 0 ? (paid / total) * 100 : 0;
}

// Every debt mutation can move totals elsewhere in the app (linked
// transactions, dashboard sums) — one list so no screen forgets one.
export const DEBT_RELATED_QUERY_KEYS = [["debts"], ["debt"], ["transactions"], ["dashboard"]];
