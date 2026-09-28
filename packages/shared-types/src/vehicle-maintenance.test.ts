import { MAX_MONEY_AMOUNT } from "./money";
import {
  MAINTENANCE_STATUSES,
  MAINTENANCE_SYSTEMS,
  MAX_MAINTENANCE_KM_INTERVAL,
  MAX_MAINTENANCE_MONTHS_INTERVAL,
  createMaintenanceRecordInputSchema,
  createMaintenanceTypeInputSchema,
} from "./vehicle-maintenance";

function localDate(offsetDays: number): string {
  const date = new Date();
  date.setDate(date.getDate() + offsetDays);
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

describe("createMaintenanceTypeInputSchema", () => {
  const base = { name: "Troca de óleo", kmInterval: 10000 };

  it("accepts name and km interval alone", () => {
    expect(createMaintenanceTypeInputSchema.safeParse(base).success).toBe(true);
  });

  it("trims the name and requires it", () => {
    const parsed = createMaintenanceTypeInputSchema.safeParse({ ...base, name: "  Óleo  " });
    expect(parsed.success && parsed.data.name).toBe("Óleo");
    expect(createMaintenanceTypeInputSchema.safeParse({ ...base, name: "   " }).success).toBe(
      false,
    );
    expect(
      createMaintenanceTypeInputSchema.safeParse({ ...base, name: "x".repeat(101) }).success,
    ).toBe(false);
  });

  it("bounds the intervals to positive integers", () => {
    for (const kmInterval of [0, -1, 1.5, MAX_MAINTENANCE_KM_INTERVAL + 1]) {
      expect(createMaintenanceTypeInputSchema.safeParse({ ...base, kmInterval }).success).toBe(
        false,
      );
    }
    expect(
      createMaintenanceTypeInputSchema.safeParse({
        ...base,
        kmInterval: MAX_MAINTENANCE_KM_INTERVAL,
      }).success,
    ).toBe(true);
    for (const monthsInterval of [0, 2.5, MAX_MAINTENANCE_MONTHS_INTERVAL + 1]) {
      expect(createMaintenanceTypeInputSchema.safeParse({ ...base, monthsInterval }).success).toBe(
        false,
      );
    }
    expect(
      createMaintenanceTypeInputSchema.safeParse({ ...base, monthsInterval: 12 }).success,
    ).toBe(true);
  });

  it("takes legacy's 13 systems and caps the description", () => {
    expect(MAINTENANCE_SYSTEMS).toHaveLength(13);
    expect(createMaintenanceTypeInputSchema.safeParse({ ...base, system: "BRAKES" }).success).toBe(
      true,
    );
    expect(createMaintenanceTypeInputSchema.safeParse({ ...base, system: "Freios" }).success).toBe(
      false,
    );
    expect(
      createMaintenanceTypeInputSchema.safeParse({ ...base, description: "x".repeat(256) }).success,
    ).toBe(false);
  });
});

describe("createMaintenanceRecordInputSchema", () => {
  const base = { maintenanceTypeId: "type-1", mileage: 42000, date: localDate(0) };

  it("accepts the required fields alone", () => {
    expect(createMaintenanceRecordInputSchema.safeParse(base).success).toBe(true);
  });

  it("requires a type and a positive whole mileage", () => {
    expect(
      createMaintenanceRecordInputSchema.safeParse({ ...base, maintenanceTypeId: "" }).success,
    ).toBe(false);
    for (const mileage of [0, -5, 1.2]) {
      expect(createMaintenanceRecordInputSchema.safeParse({ ...base, mileage }).success).toBe(
        false,
      );
    }
  });

  it("rejects impossible and future dates, accepts past ones", () => {
    expect(
      createMaintenanceRecordInputSchema.safeParse({ ...base, date: "2026-02-31" }).success,
    ).toBe(false);
    expect(
      createMaintenanceRecordInputSchema.safeParse({ ...base, date: localDate(1) }).success,
    ).toBe(false);
    expect(
      createMaintenanceRecordInputSchema.safeParse({ ...base, date: localDate(-400) }).success,
    ).toBe(true);
  });

  it("takes a non-negative cost with at most 2 decimals", () => {
    expect(createMaintenanceRecordInputSchema.safeParse({ ...base, cost: 0 }).success).toBe(true);
    expect(createMaintenanceRecordInputSchema.safeParse({ ...base, cost: 289.9 }).success).toBe(
      true,
    );
    expect(createMaintenanceRecordInputSchema.safeParse({ ...base, cost: -1 }).success).toBe(false);
    expect(createMaintenanceRecordInputSchema.safeParse({ ...base, cost: 1.234 }).success).toBe(
      false,
    );
    expect(
      createMaintenanceRecordInputSchema.safeParse({ ...base, cost: MAX_MONEY_AMOUNT + 1 }).success,
    ).toBe(false);
  });

  it("caps location and notes", () => {
    expect(
      createMaintenanceRecordInputSchema.safeParse({ ...base, location: "x".repeat(101) }).success,
    ).toBe(false);
    expect(
      createMaintenanceRecordInputSchema.safeParse({ ...base, notes: "x".repeat(501) }).success,
    ).toBe(false);
  });

  it("orders statuses from least to most urgent", () => {
    expect(MAINTENANCE_STATUSES).toEqual(["ON_TRACK", "WARNING", "URGENT", "OVERDUE"]);
  });
});
