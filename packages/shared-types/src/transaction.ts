import { z } from "zod";

import { workspaceTypeSchema } from "./auth";

export const transactionTypeSchema = z.enum(["INCOME", "EXPENSE"]);
export type TransactionType = z.infer<typeof transactionTypeSchema>;

export const transactionStatusSchema = z.enum(["PAID", "PENDING"]);
export type TransactionStatus = z.infer<typeof transactionStatusSchema>;

export const transactionSchema = z.object({
  id: z.string(),
  categoryId: z.string(),
  workspace: workspaceTypeSchema,
  type: transactionTypeSchema,
  status: transactionStatusSchema,
  description: z.string(),
  amount: z.string(),
  date: z.string(),
  recurring: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type Transaction = z.infer<typeof transactionSchema>;

export const transactionSummarySchema = z.object({
  totalIncome: z.string(),
  totalExpensesPaid: z.string(),
  totalExpensesPending: z.string(),
  balance: z.string(),
});

export type TransactionSummary = z.infer<typeof transactionSummarySchema>;

// Validation messages here render as inline form errors in the mobile UI,
// so they're pt-BR — see docs/steering/tech.md "Language policy".
export const createTransactionInputSchema = z.object({
  categoryId: z.string().min(1, "Categoria é obrigatória"),
  type: transactionTypeSchema,
  status: transactionStatusSchema.optional(),
  description: z
    .string()
    .min(1, "Descrição é obrigatória")
    .max(255, "Descrição deve ter no máximo 255 caracteres"),
  amount: z
    .number({ invalid_type_error: "Valor é obrigatório" })
    .positive("Valor deve ser maior que zero")
    // String-based check, not `value * 100` — floating-point
    // multiplication loses precision for ordinary amounts (e.g.
    // 1.15 * 100 === 114.99999999999999), which would reject valid
    // to-the-cent values essentially at random.
    .refine((value) => /^\d+(\.\d{1,2})?$/.test(value.toString()), {
      message: "Valor deve ter no máximo 2 casas decimais",
    }),
  date: z.string().min(1, "Data é obrigatória"),
  recurring: z.boolean().optional(),
  recurringMonths: z
    .number()
    .int()
    .min(1, "Recorrência deve durar entre 1 e 60 meses")
    .max(60, "Recorrência deve durar entre 1 e 60 meses")
    .optional(),
});

export type CreateTransactionInput = z.infer<typeof createTransactionInputSchema>;

// `type` and `recurringMonths` aren't editable — matches legacy
// (atualizarTransacao never takes a `tipo` param) and recurring batches
// are only generated once, at creation.
export const updateTransactionInputSchema = z.object({
  categoryId: z.string().min(1, "Categoria é obrigatória").optional(),
  description: z
    .string()
    .min(1, "Descrição é obrigatória")
    .max(255, "Descrição deve ter no máximo 255 caracteres")
    .optional(),
  amount: z
    .number()
    .positive("Valor deve ser maior que zero")
    // String-based check, not `value * 100` — floating-point
    // multiplication loses precision for ordinary amounts (e.g.
    // 1.15 * 100 === 114.99999999999999), which would reject valid
    // to-the-cent values essentially at random.
    .refine((value) => /^\d+(\.\d{1,2})?$/.test(value.toString()), {
      message: "Valor deve ter no máximo 2 casas decimais",
    })
    .optional(),
  date: z.string().min(1, "Data é obrigatória").optional(),
});

export type UpdateTransactionInput = z.infer<typeof updateTransactionInputSchema>;

export const updateTransactionStatusInputSchema = z.object({
  status: transactionStatusSchema,
});

export type UpdateTransactionStatusInput = z.infer<typeof updateTransactionStatusInputSchema>;

const CURRENCY_FORMATTER = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

// Amounts always arrive from the API as decimal strings (never floats,
// see design.md) — this parses that string once, at the display edge.
export function formatCurrency(amount: string): string {
  return CURRENCY_FORMATTER.format(Number(amount));
}
