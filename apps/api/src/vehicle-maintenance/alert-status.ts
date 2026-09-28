import { MAINTENANCE_STATUSES, type MaintenanceStatus } from "@mony/shared-types";

import { addMonthsToDateString, parseDateOnly } from "../common/utils/date.util";

export interface AlertStatusInput {
  currentMileage: number;
  // The alert's `mileageAlert`: the mileage the next service is due at.
  mileageAlert: number;
  kmInterval: number;
  monthsInterval: number | null;
  // The type's latest record on the vehicle (highest mileage, then
  // latest date), or null if it was never serviced.
  lastService: { date: string; mileage: number } | null;
}

export interface AlertStatusResult {
  status: MaintenanceStatus;
  percent: number;
  kmRemaining: number;
  nextDate: string | null;
  daysRemaining: number | null;
}

interface Signal {
  status: MaintenanceStatus;
  percent: number;
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function rank(status: MaintenanceStatus): number {
  return MAINTENANCE_STATUSES.indexOf(status);
}

// Legacy `verificarManutencoesPendentes` km branch.
function kmSignal(input: AlertStatusInput, kmRemaining: number): Signal {
  if (!input.lastService || kmRemaining <= 0) return { status: "OVERDUE", percent: 100 };
  if (kmRemaining <= input.kmInterval * 0.1) return { status: "URGENT", percent: 90 };
  if (kmRemaining <= input.kmInterval * 0.2) return { status: "WARNING", percent: 80 };
  const driven = input.currentMileage - input.lastService.mileage;
  const wear = Math.floor((driven / input.kmInterval) * 100);
  return { status: "ON_TRACK", percent: Math.min(70, Math.max(0, wear)) };
}

// Legacy time branch: only escalates (<= 30 days), never produces
// ON_TRACK on its own.
function timeSignal(daysRemaining: number): Signal | null {
  if (daysRemaining <= 0) return { status: "OVERDUE", percent: 100 };
  if (daysRemaining <= 15) return { status: "URGENT", percent: 90 };
  if (daysRemaining <= 30) return { status: "WARNING", percent: 80 };
  return null;
}

// Live status of one maintenance alert (docs/specs/vehicle-maintenance/
// requirements.md → Alerts). Pure: `today` ("YYYY-MM-DD", UTC) is passed
// in. Never throws — sparse data always resolves to a status.
//
// Takes the more urgent of the km and time signals for both status and
// percent. (Legacy overwrote the status with the time signal's, so a
// km-overdue item within 30 days of its date read as merely "alerta".)
export function computeAlertStatus(input: AlertStatusInput, today: string): AlertStatusResult {
  const kmRemaining = input.mileageAlert - input.currentMileage;
  let result = kmSignal(input, kmRemaining);

  let nextDate: string | null = null;
  let daysRemaining: number | null = null;
  if (input.lastService && input.monthsInterval) {
    nextDate = addMonthsToDateString(input.lastService.date, input.monthsInterval);
    daysRemaining = Math.round(
      (parseDateOnly(nextDate).getTime() - parseDateOnly(today).getTime()) / MS_PER_DAY,
    );
    const time = timeSignal(daysRemaining);
    if (time) {
      result = {
        status: rank(time.status) > rank(result.status) ? time.status : result.status,
        percent: Math.max(result.percent, time.percent),
      };
    }
  }

  return { ...result, kmRemaining, nextDate, daysRemaining };
}

// Most urgent first (legacy sorted by percent), then the closest by km.
export function compareByUrgency(
  a: Pick<AlertStatusResult, "percent" | "kmRemaining">,
  b: Pick<AlertStatusResult, "percent" | "kmRemaining">,
): number {
  return b.percent - a.percent || a.kmRemaining - b.kmRemaining;
}
