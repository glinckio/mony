import { z } from "zod";

import { isCalendarDate } from "./date";
import { MAX_MONEY_AMOUNT, nonNegativeAmountSchema } from "./money";
import { MAX_VEHICLE_MILEAGE } from "./vehicle";

// Legacy `tipos_manutencao.sistema` fixed <select> (pt-BR labels live in
// the mobile app). Optional on a type: legacy grouped unset ones as
// "Geral".
export const MAINTENANCE_SYSTEMS = [
  "ENGINE",
  "BRAKES",
  "SUSPENSION",
  "TRANSMISSION",
  "ELECTRICAL",
  "COOLING",
  "FUEL",
  "LUBRICATION",
  "STEERING",
  "WHEELS_TIRES",
  "CLIMATE",
  "BODY",
  "OTHER",
] as const;

export const maintenanceSystemSchema = z.enum(MAINTENANCE_SYSTEMS);
export type MaintenanceSystem = z.infer<typeof maintenanceSystemSchema>;

// Least to most urgent — the order the status computation ranks them in.
export const MAINTENANCE_STATUSES = ["ON_TRACK", "WARNING", "URGENT", "OVERDUE"] as const;

export const maintenanceStatusSchema = z.enum(MAINTENANCE_STATUSES);
export type MaintenanceStatus = z.infer<typeof maintenanceStatusSchema>;

export const MAX_MAINTENANCE_KM_INTERVAL = 1_000_000;
export const MAX_MAINTENANCE_MONTHS_INTERVAL = 120;
export const MAINTENANCE_RECEIPT_MAX_BYTES = 10 * 1024 * 1024;

export const maintenanceTypeSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  system: maintenanceSystemSchema.nullable(),
  kmInterval: z.number(),
  monthsInterval: z.number().nullable(),
  createdAt: z.string(),
});

export type MaintenanceType = z.infer<typeof maintenanceTypeSchema>;

export const maintenanceAlertStatusSchema = z.object({
  maintenanceTypeId: z.string(),
  name: z.string(),
  system: maintenanceSystemSchema.nullable(),
  kmInterval: z.number(),
  monthsInterval: z.number().nullable(),
  status: maintenanceStatusSchema,
  // 0–100: how close to due (legacy "porcentagem").
  percent: z.number(),
  nextMileage: z.number(),
  // Negative once passed.
  kmRemaining: z.number(),
  // Only when the type has a months interval and was serviced before.
  nextDate: z.string().nullable(),
  daysRemaining: z.number().nullable(),
  lastService: z.object({ date: z.string(), mileage: z.number() }).nullable(),
});

export type MaintenanceAlertStatus = z.infer<typeof maintenanceAlertStatusSchema>;

export const MAINTENANCE_RECEIPT_KINDS = ["IMAGE", "PDF"] as const;
export type MaintenanceReceiptKind = (typeof MAINTENANCE_RECEIPT_KINDS)[number];

export const maintenanceRecordSchema = z.object({
  id: z.string(),
  vehicleId: z.string(),
  maintenanceTypeId: z.string(),
  type: z.object({ name: z.string(), system: maintenanceSystemSchema.nullable() }),
  mileage: z.number(),
  date: z.string(),
  // Decimal as a 2-decimal string, like every money field in responses.
  cost: z.string().nullable(),
  location: z.string().nullable(),
  notes: z.string().nullable(),
  // Short-lived signed URL, minted per response — never store it.
  receipt: z.object({ url: z.string(), kind: z.enum(MAINTENANCE_RECEIPT_KINDS) }).nullable(),
  createdAt: z.string(),
});

export type MaintenanceRecord = z.infer<typeof maintenanceRecordSchema>;

// Validation messages render as inline form errors in the mobile UI, so
// they're pt-BR — see docs/steering/tech.md "Language policy".
const optionalText = (max: number, label: string) =>
  z.string().trim().max(max, `${label} deve ter no máximo ${max} caracteres`);

const intervalSchema = (label: string, max: number) =>
  z
    .number({
      invalid_type_error: `${label} é obrigatório`,
      required_error: `${label} é obrigatório`,
    })
    .int(`${label} deve ser um número inteiro`)
    .min(1, `${label} deve ser maior que zero`)
    .max(max, `${label} muito alto`);

export const createMaintenanceTypeInputSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Nome é obrigatório")
    .max(100, "Nome deve ter no máximo 100 caracteres"),
  kmInterval: intervalSchema("Intervalo em km", MAX_MAINTENANCE_KM_INTERVAL),
  monthsInterval: intervalSchema("Intervalo em meses", MAX_MAINTENANCE_MONTHS_INTERVAL).optional(),
  system: maintenanceSystemSchema.optional(),
  description: optionalText(255, "Descrição").optional(),
});

export type CreateMaintenanceTypeInput = z.infer<typeof createMaintenanceTypeInputSchema>;

// "Today" from the device's own calendar: a Brazilian user's local date is
// never ahead of the API's UTC date, so this never rejects something the
// API would accept.
function localTodayString(now: Date = new Date()): string {
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

export const createMaintenanceRecordInputSchema = z.object({
  maintenanceTypeId: z
    .string({ required_error: "Escolha o tipo de manutenção" })
    .min(1, "Escolha o tipo de manutenção"),
  mileage: z
    .number({
      invalid_type_error: "Quilometragem é obrigatória",
      required_error: "Quilometragem é obrigatória",
    })
    .int("Quilometragem deve ser um número inteiro")
    .min(1, "Quilometragem deve ser maior que zero")
    .max(MAX_VEHICLE_MILEAGE, "Quilometragem muito alta"),
  date: z
    .string({ required_error: "Data é obrigatória" })
    .min(1, "Data é obrigatória")
    .refine(isCalendarDate, "Data inválida")
    .refine((value) => value <= localTodayString(), "A data não pode estar no futuro"),
  cost: nonNegativeAmountSchema
    .refine((value) => value <= MAX_MONEY_AMOUNT, "Valor muito alto")
    .optional(),
  location: optionalText(100, "Local").optional(),
  notes: optionalText(500, "Observações").optional(),
});

export type CreateMaintenanceRecordInput = z.infer<typeof createMaintenanceRecordInputSchema>;
