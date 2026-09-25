import { z } from "zod";

// Largest value a `Decimal(12,2)` money column holds — the single cap
// both the API DTOs and the mobile forms validate against.
export const MAX_MONEY_AMOUNT = 9_999_999_999.99;

const TWO_DECIMALS_REGEX = /^\d+(\.\d{1,2})?$/;

// Never `value * 100` to check decimal precision — that loses precision
// for ordinary amounts (e.g. 1.15 * 100 === 114.99999999999999), which
// would reject valid to-the-cent values essentially at random.
// String-based instead, matching the API's class-validator
// `maxDecimalPlaces` approach.
export function hasAtMostTwoDecimals(value: number): boolean {
  return TWO_DECIMALS_REGEX.test(value.toString());
}

export const positiveAmountSchema = z
  .number({ invalid_type_error: "Valor é obrigatório", required_error: "Valor é obrigatório" })
  .positive("Valor deve ser maior que zero")
  .refine(hasAtMostTwoDecimals, { message: "Valor deve ter no máximo 2 casas decimais" });

export const nonNegativeAmountSchema = z
  .number({ invalid_type_error: "Valor é obrigatório", required_error: "Valor é obrigatório" })
  .min(0, "Valor não pode ser negativo")
  .refine(hasAtMostTwoDecimals, { message: "Valor deve ter no máximo 2 casas decimais" });
