import { z } from "zod";

import { isCalendarDate } from "./date";

// Legacy `veiculo_adicionar.php` fixed list (pt-BR labels live in the
// mobile app).
export const FUEL_TYPES = [
  "GASOLINE",
  "ETHANOL",
  "FLEX",
  "DIESEL",
  "ELECTRIC",
  "HYBRID",
  "CNG",
  "OTHER",
] as const;

export const fuelTypeSchema = z.enum(FUEL_TYPES);
export type FuelType = z.infer<typeof fuelTypeSchema>;

// Legacy year range: > 1900 and up to next year.
export const MIN_VEHICLE_YEAR = 1901;
export function maxVehicleYear(now: Date = new Date()): number {
  return now.getUTCFullYear() + 1;
}

// Largest mileage we accept (fits Postgres INT comfortably; no car gets
// near it) — keeps a typo from overflowing the column.
export const MAX_VEHICLE_MILEAGE = 9_999_999;

export const VEHICLE_PHOTO_MAX_BYTES = 5 * 1024 * 1024;

export const vehicleSchema = z.object({
  id: z.string(),
  make: z.string(),
  model: z.string(),
  // "{make} {model} {modelYear}" — legacy `nome_completo`.
  displayName: z.string(),
  manufactureYear: z.number(),
  modelYear: z.number(),
  currentMileage: z.number(),
  licensePlate: z.string().nullable(),
  acquisitionDate: z.string().nullable(),
  color: z.string().nullable(),
  fuelType: fuelTypeSchema.nullable(),
  // Short-lived signed URL, minted per response — never store it.
  photoUrl: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type Vehicle = z.infer<typeof vehicleSchema>;

// Validation messages here render as inline form errors in the mobile UI,
// so they're pt-BR — see docs/steering/tech.md "Language policy".
function yearSchema(label: string) {
  return z
    .number({
      invalid_type_error: `${label} é obrigatório`,
      required_error: `${label} é obrigatório`,
    })
    .int(`${label} inválido`)
    .min(MIN_VEHICLE_YEAR, `${label} inválido`)
    .refine((year) => year <= maxVehicleYear(), { message: `${label} inválido` });
}

const mileageSchema = z
  .number({
    invalid_type_error: "Quilometragem é obrigatória",
    required_error: "Quilometragem é obrigatória",
  })
  .int("Quilometragem deve ser um número inteiro")
  .min(0, "Quilometragem não pode ser negativa")
  .max(MAX_VEHICLE_MILEAGE, "Quilometragem muito alta");

const optionalText = (max: number, label: string) =>
  z.string().trim().max(max, `${label} deve ter no máximo ${max} caracteres`);

const vehicleFieldsSchema = z.object({
  make: z
    .string()
    .trim()
    .min(1, "Marca é obrigatória")
    .max(100, "Marca deve ter no máximo 100 caracteres"),
  model: z
    .string()
    .trim()
    .min(1, "Modelo é obrigatório")
    .max(100, "Modelo deve ter no máximo 100 caracteres"),
  manufactureYear: yearSchema("Ano de fabricação"),
  modelYear: yearSchema("Ano do modelo"),
  currentMileage: mileageSchema,
  licensePlate: optionalText(10, "Placa").optional(),
  acquisitionDate: z.string().refine(isCalendarDate, "Data inválida").optional(),
  color: optionalText(50, "Cor").optional(),
  fuelType: fuelTypeSchema.optional(),
});

function modelYearNotBeforeManufacture(data: {
  manufactureYear?: number;
  modelYear?: number;
}): boolean {
  if (data.manufactureYear === undefined || data.modelYear === undefined) return true;
  return data.modelYear >= data.manufactureYear;
}

const MODEL_YEAR_MESSAGE = "O ano do modelo não pode ser anterior ao ano de fabricação";

export const createVehicleInputSchema = vehicleFieldsSchema.refine(modelYearNotBeforeManufacture, {
  message: MODEL_YEAR_MESSAGE,
  path: ["modelYear"],
});

export type CreateVehicleInput = z.infer<typeof createVehicleInputSchema>;

// `null` clears an optional field; omitting leaves it unchanged.
export const updateVehicleInputSchema = vehicleFieldsSchema
  .partial()
  .extend({
    licensePlate: optionalText(10, "Placa").nullable().optional(),
    acquisitionDate: z.string().refine(isCalendarDate, "Data inválida").nullable().optional(),
    color: optionalText(50, "Cor").nullable().optional(),
    fuelType: fuelTypeSchema.nullable().optional(),
  })
  .refine(modelYearNotBeforeManufacture, { message: MODEL_YEAR_MESSAGE, path: ["modelYear"] });

export type UpdateVehicleInput = z.infer<typeof updateVehicleInputSchema>;

// The detail screen's quick "update mileage" sheet — can't go down,
// checked against the value the screen loaded (the API re-checks).
export function updateMileageInputSchema(currentMileage: number) {
  return z.object({
    currentMileage: mileageSchema.refine((value) => value >= currentMileage, {
      message: `A quilometragem não pode ser menor que a atual (${currentMileage.toLocaleString("pt-BR")} km)`,
    }),
  });
}

export type UpdateMileageInput = { currentMileage: number };
