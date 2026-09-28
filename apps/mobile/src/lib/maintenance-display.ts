import type {
  MaintenanceAlertStatus,
  MaintenanceStatus,
  MaintenanceSystem,
  MaintenanceType,
} from "@mony/shared-types";

import type { StatusKind } from "../components/domain/StatusPill";

// Legacy `manutencao_registrar.php` <select> labels.
export const MAINTENANCE_SYSTEM_LABELS: Record<MaintenanceSystem, string> = {
  ENGINE: "Motor",
  BRAKES: "Freios",
  SUSPENSION: "Suspensão",
  TRANSMISSION: "Transmissão",
  ELECTRICAL: "Elétrica",
  COOLING: "Arrefecimento",
  FUEL: "Combustível",
  LUBRICATION: "Lubrificação",
  STEERING: "Direção",
  WHEELS_TIRES: "Rodas e pneus",
  CLIMATE: "Climatização",
  BODY: "Carroceria",
  OTHER: "Outros",
};

// Types without a system (legacy grouped them as "Geral").
export const NO_SYSTEM_LABEL = "Geral";

export function systemLabel(system: MaintenanceSystem | null): string {
  return system ? MAINTENANCE_SYSTEM_LABELS[system] : NO_SYSTEM_LABEL;
}

export const MAINTENANCE_STATUS_KIND: Record<MaintenanceStatus, StatusKind> = {
  OVERDUE: "maintenanceOverdue",
  URGENT: "maintenanceUrgent",
  WARNING: "maintenanceWarning",
  ON_TRACK: "maintenanceOnTrack",
};

// Same words the status pill shows — for screen-reader labels.
export const MAINTENANCE_STATUS_LABELS: Record<MaintenanceStatus, string> = {
  OVERDUE: "Atrasada",
  URGENT: "Urgente",
  WARNING: "Atenção",
  ON_TRACK: "Em dia",
};

export const MAINTENANCE_STATUS_TONE: Record<MaintenanceStatus, "danger" | "warning" | "success"> =
  {
    OVERDUE: "danger",
    URGENT: "danger",
    WARNING: "warning",
    ON_TRACK: "success",
  };

const km = (value: number) => `${value.toLocaleString("pt-BR")} km`;

// "Nunca registrada" / "Faltam 1.200 km" / "Passou 300 km" / "Vence agora".
export function distanceCopy(alert: MaintenanceAlertStatus): string {
  if (!alert.lastService) return "Nunca registrada";
  if (alert.kmRemaining > 0) return `Faltam ${km(alert.kmRemaining)}`;
  if (alert.kmRemaining === 0) return "Vence agora";
  return `Passou ${km(-alert.kmRemaining)}`;
}

// "Vence hoje" / "Vence amanhã" / "Vence em 12 dias" / "Venceu há 5 dias";
// null when the type has no time interval or was never serviced.
export function timeCopy(alert: MaintenanceAlertStatus): string | null {
  const days = alert.daysRemaining;
  if (days === null) return null;
  if (days === 0) return "Vence hoje";
  if (days === 1) return "Vence amanhã";
  if (days > 1) return `Vence em ${days} dias`;
  if (days === -1) return "Venceu ontem";
  return `Venceu há ${-days} dias`;
}

// "a cada 10.000 km ou 12 meses"
export function intervalCopy(type: Pick<MaintenanceType, "kmInterval" | "monthsInterval">): string {
  const months = type.monthsInterval;
  const time = months ? ` ou ${months} ${months === 1 ? "mês" : "meses"}` : "";
  return `a cada ${km(type.kmInterval)}${time}`;
}

export interface SystemGroup<T> {
  system: MaintenanceSystem | null;
  title: string;
  items: T[];
}

// Groups in the order the API sorted them (by system, "Geral" last).
export function groupBySystem<T extends { system: MaintenanceSystem | null }>(
  items: T[],
): SystemGroup<T>[] {
  const groups: SystemGroup<T>[] = [];
  for (const item of items) {
    const last = groups[groups.length - 1];
    if (last && last.system === item.system) last.items.push(item);
    else groups.push({ system: item.system, title: systemLabel(item.system), items: [item] });
  }
  return groups;
}

export interface AlertCounts {
  overdue: number;
  urgent: number;
  warning: number;
}

export function countAlerts(alerts: MaintenanceAlertStatus[]): AlertCounts {
  return {
    overdue: alerts.filter((alert) => alert.status === "OVERDUE").length,
    urgent: alerts.filter((alert) => alert.status === "URGENT").length,
    warning: alerts.filter((alert) => alert.status === "WARNING").length,
  };
}

// Queries a maintenance write changes: always the vehicle's alerts and
// history; the vehicle itself only when a record raised its mileage
// (deleting a record never lowers it).
export function maintenanceQueryKeys(vehicleId: string, { vehicleChanged = false } = {}) {
  const keys: ReadonlyArray<readonly unknown[]> = [
    ["maintenance-alerts", vehicleId],
    ["maintenance-records", vehicleId],
  ];
  return vehicleChanged ? [...keys, ["vehicle", vehicleId], ["vehicles"]] : keys;
}
