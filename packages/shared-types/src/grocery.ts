import { z } from "zod";

import { MAX_MONEY_AMOUNT, hasAtMostTwoDecimals, nonNegativeAmountSchema } from "./money";

// Fixed list, matches legacy `mercado.php` exactly (not FK'd to Category).
// pt-BR labels live in the mobile app.
export const GROCERY_CATEGORIES = [
  "FOOD",
  "BEVERAGES",
  "MEAT",
  "FROZEN",
  "DAIRY_AND_DELI",
  "PERSONAL_CARE",
  "PRODUCE",
  "CLEANING",
  "PANTRY",
  "BAKERY",
  "PETS",
  "HOUSEHOLD",
] as const;

export const groceryCategorySchema = z.enum(GROCERY_CATEGORIES);
export type GroceryCategory = z.infer<typeof groceryCategorySchema>;

// Upper bound of the `Decimal(10,2)` quantity/price columns.
export const MAX_GROCERY_DECIMAL = 99_999_999.99;

export const groceryItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  unit: z.string(),
  idealQuantity: z.string(),
  currentQuantity: z.string(),
  // Per unit.
  estimatedPrice: z.string(),
  category: groceryCategorySchema,
  // currentQuantity < idealQuantity, computed server-side.
  missing: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type GroceryItem = z.infer<typeof groceryItemSchema>;

export const groceryBudgetSchema = z.object({
  amount: z.string().nullable(),
  setAt: z.string().nullable(),
});

export type GroceryBudget = z.infer<typeof groceryBudgetSchema>;

export const grocerySummarySchema = z.object({
  totalItemCount: z.number(),
  missingItemCount: z.number(),
  estimatedPurchaseTotal: z.string(),
});

export type GrocerySummary = z.infer<typeof grocerySummarySchema>;

// Validation messages here render as inline form errors in the mobile UI,
// so they're pt-BR — see docs/steering/tech.md "Language policy".
function decimalFieldSchema(messages: { required: string; negative: string; tooHigh: string }) {
  return z
    .number({ invalid_type_error: messages.required, required_error: messages.required })
    .min(0, messages.negative)
    .max(MAX_GROCERY_DECIMAL, messages.tooHigh)
    .refine(hasAtMostTwoDecimals, { message: "Use no máximo 2 casas decimais" });
}

const idealQuantitySchema = decimalFieldSchema({
  required: "Quantidade ideal é obrigatória",
  negative: "Quantidade ideal não pode ser negativa",
  tooHigh: "Quantidade ideal muito alta",
});

const currentQuantitySchema = decimalFieldSchema({
  required: "Quantidade atual é obrigatória",
  negative: "Quantidade atual não pode ser negativa",
  tooHigh: "Quantidade atual muito alta",
});

const estimatedPriceSchema = decimalFieldSchema({
  required: "Preço estimado é obrigatório",
  negative: "Preço estimado não pode ser negativo",
  tooHigh: "Preço estimado muito alto",
});

const nameSchema = z
  .string()
  .trim()
  .min(1, "Nome é obrigatório")
  .max(100, "Nome deve ter no máximo 100 caracteres");

const unitSchema = z
  .string()
  .trim()
  .min(1, "Unidade é obrigatória")
  .max(30, "Unidade deve ter no máximo 30 caracteres");

const categorySchema = z.enum(GROCERY_CATEGORIES, {
  errorMap: () => ({ message: "Categoria é obrigatória" }),
});

export const createGroceryItemInputSchema = z.object({
  name: nameSchema,
  unit: unitSchema,
  idealQuantity: idealQuantitySchema,
  currentQuantity: currentQuantitySchema.optional(),
  estimatedPrice: estimatedPriceSchema,
  category: categorySchema,
});

export type CreateGroceryItemInput = z.infer<typeof createGroceryItemInputSchema>;

export const updateGroceryItemInputSchema = createGroceryItemInputSchema.partial();

export type UpdateGroceryItemInput = z.infer<typeof updateGroceryItemInputSchema>;

export const setGroceryBudgetInputSchema = z.object({
  amount: nonNegativeAmountSchema.refine((value) => value <= MAX_MONEY_AMOUNT, {
    message: "Valor muito alto",
  }),
});

export type SetGroceryBudgetInput = z.infer<typeof setGroceryBudgetInputSchema>;
