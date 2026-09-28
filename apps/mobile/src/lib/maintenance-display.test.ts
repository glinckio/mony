import type { MaintenanceAlertStatus } from "@mony/shared-types";

import {
  countAlerts,
  distanceCopy,
  groupBySystem,
  intervalCopy,
  systemLabel,
  timeCopy,
} from "./maintenance-display";

function alert(overrides: Partial<MaintenanceAlertStatus> = {}): MaintenanceAlertStatus {
  return {
    maintenanceTypeId: "mt-1",
    name: "Troca de óleo",
    system: "LUBRICATION",
    kmInterval: 10000,
    monthsInterval: 12,
    status: "ON_TRACK",
    percent: 20,
    nextMileage: 50000,
    kmRemaining: 8000,
    nextDate: "2027-06-01",
    daysRemaining: 240,
    lastService: { date: "2026-06-01", mileage: 40000 },
    ...overrides,
  };
}

describe("maintenance-display", () => {
  it("says how far away the next service is, in km", () => {
    expect(distanceCopy(alert({ kmRemaining: 1200 }))).toBe("Faltam 1.200 km");
    expect(distanceCopy(alert({ kmRemaining: 0 }))).toBe("Vence agora");
    expect(distanceCopy(alert({ kmRemaining: -300 }))).toBe("Passou 300 km");
    expect(distanceCopy(alert({ lastService: null, kmRemaining: 10000 }))).toBe("Nunca registrada");
  });

  it("says when it's due by date, only when there is a date", () => {
    expect(timeCopy(alert({ daysRemaining: 12 }))).toBe("Vence em 12 dias");
    expect(timeCopy(alert({ daysRemaining: 1 }))).toBe("Vence amanhã");
    expect(timeCopy(alert({ daysRemaining: 0 }))).toBe("Vence hoje");
    expect(timeCopy(alert({ daysRemaining: -1 }))).toBe("Venceu ontem");
    expect(timeCopy(alert({ daysRemaining: -5 }))).toBe("Venceu há 5 dias");
    expect(timeCopy(alert({ daysRemaining: null }))).toBeNull();
  });

  it("describes the interval in pt-BR", () => {
    expect(intervalCopy({ kmInterval: 10000, monthsInterval: 12 })).toBe(
      "a cada 10.000 km ou 12 meses",
    );
    expect(intervalCopy({ kmInterval: 5000, monthsInterval: 1 })).toBe("a cada 5.000 km ou 1 mês");
    expect(intervalCopy({ kmInterval: 30000, monthsInterval: null })).toBe("a cada 30.000 km");
  });

  it("groups consecutive items by system, types without one as 'Geral'", () => {
    const groups = groupBySystem([
      { id: "a", system: "BRAKES" as const },
      { id: "b", system: "BRAKES" as const },
      { id: "c", system: null },
    ]);
    expect(groups.map((group) => [group.title, group.items.map((item) => item.id)])).toEqual([
      ["Freios", ["a", "b"]],
      ["Geral", ["c"]],
    ]);
    expect(systemLabel("WHEELS_TIRES")).toBe("Rodas e pneus");
  });

  it("counts the alerts that need attention", () => {
    expect(
      countAlerts([
        alert({ status: "OVERDUE" }),
        alert({ status: "OVERDUE" }),
        alert({ status: "URGENT" }),
        alert({ status: "WARNING" }),
        alert({ status: "ON_TRACK" }),
      ]),
    ).toEqual({ overdue: 2, urgent: 1, warning: 1 });
  });
});
