import { z } from "zod";

import { workspaceTypeSchema } from "./auth";
import { isCalendarDate } from "./date";
import { positiveAmountSchema } from "./money";

// 35 years of monthly installments (a long Brazilian mortgage) — caps how
// many installment + transaction rows a single request can generate.
export const MAX_DEBT_INSTALLMENTS = 420;

export const debtStatusSchema = z.enum(["ACTIVE", "PAID_OFF", "OVERDUE"]);
export type DebtStatus = z.infer<typeof debtStatusSchema>;

export const installmentStatusSchema = z.enum(["PENDING", "PAID"]);
export type InstallmentStatus = z.infer<typeof installmentStatusSchema>;

export const debtSchema = z.object({
  id: z.string(),
  workspace: workspaceTypeSchema,
  categoryId: z.string().nullable(),
  name: z.string(),
  totalAmount: z.string(),
  paidAmount: z.string(),
  // totalAmount - paidAmount, computed server-side with exact decimals.
  remainingAmount: z.string(),
  startDate: z.string(),
  endDate: z.string().nullable(),
  // Informational only — never applied to installment amounts.
  interestRate: z.string().nullable(),
  totalInstallments: z.number(),
  paidInstallments: z.number(),
  notes: z.string().nullable(),
  status: debtStatusSchema,
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type Debt = z.infer<typeof debtSchema>;

export const debtInstallmentSchema = z.object({
  id: z.string(),
  installmentNo: z.number(),
  amount: z.string(),
  dueDate: z.string(),
  status: installmentStatusSchema,
  paymentDate: z.string().nullable(),
  transactionId: z.string().nullable(),
});

export type DebtInstallment = z.infer<typeof debtInstallmentSchema>;

export const debtWithInstallmentsSchema = debtSchema.extend({
  installments: z.array(debtInstallmentSchema),
});

export type DebtWithInstallments = z.infer<typeof debtWithInstallmentsSchema>;

const TWO_DECIMALS_REGEX = /^\d+(\.\d{1,2})?$/;

// Validation messages here render as inline form errors in the mobile UI,
// so they're pt-BR — see docs/steering/tech.md "Language policy".
const nameSchema = z
  .string()
  .min(1, "Nome é obrigatório")
  .max(100, "Nome deve ter no máximo 100 caracteres");

const totalInstallmentsSchema = z
  .number({
    invalid_type_error: "Número de parcelas é obrigatório",
    required_error: "Número de parcelas é obrigatório",
  })
  .int("Número de parcelas deve ser inteiro")
  .min(1, `Número de parcelas deve ser entre 1 e ${MAX_DEBT_INSTALLMENTS}`)
  .max(MAX_DEBT_INSTALLMENTS, `Número de parcelas deve ser entre 1 e ${MAX_DEBT_INSTALLMENTS}`);

const interestRateSchema = z
  .number({ invalid_type_error: "Taxa de juros inválida" })
  .min(0, "Taxa de juros não pode ser negativa")
  .max(999.99, "Taxa de juros deve ser no máximo 999,99%")
  .refine((value) => TWO_DECIMALS_REGEX.test(value.toString()), {
    message: "Taxa de juros deve ter no máximo 2 casas decimais",
  });

const notesSchema = z.string().max(500, "Observações devem ter no máximo 500 caracteres");

const INVALID_DATE_MESSAGE = "Data inválida";

function requiredDateSchema(requiredMessage: string) {
  return z.string().min(1, requiredMessage).refine(isCalendarDate, INVALID_DATE_MESSAGE);
}

const optionalDateSchema = z.string().refine(isCalendarDate, INVALID_DATE_MESSAGE);

// Every installment must be at least R$ 0,01 — mirrors the API's 400 for
// the same case, so the form catches it inline instead.
function coversOneCentPerInstallment(data: {
  totalAmount?: number;
  totalInstallments?: number;
}): boolean {
  if (data.totalAmount === undefined || data.totalInstallments === undefined) return true;
  return Math.round(data.totalAmount * 100) >= data.totalInstallments;
}

function endDateNotBeforeStart(data: { startDate?: string; endDate?: string | null }): boolean {
  if (!data.startDate || !data.endDate) return true;
  return data.endDate >= data.startDate;
}

const TOO_MANY_INSTALLMENTS_MESSAGE = "Valor total muito baixo para esse número de parcelas";
const END_BEFORE_START_MESSAGE = "Data final deve ser igual ou posterior à data inicial";

export const createDebtInputSchema = z
  .object({
    name: nameSchema,
    totalAmount: positiveAmountSchema,
    totalInstallments: totalInstallmentsSchema,
    startDate: requiredDateSchema("Data da primeira parcela é obrigatória"),
    endDate: optionalDateSchema.optional(),
    interestRate: interestRateSchema.optional(),
    categoryId: z.string().optional(),
    notes: notesSchema.optional(),
  })
  .refine(coversOneCentPerInstallment, {
    message: TOO_MANY_INSTALLMENTS_MESSAGE,
    path: ["totalAmount"],
  })
  .refine(endDateNotBeforeStart, { message: END_BEFORE_START_MESSAGE, path: ["endDate"] });

export type CreateDebtInput = z.infer<typeof createDebtInputSchema>;

// `null` clears an optional field; omitting it leaves it unchanged.
export const updateDebtInputSchema = z
  .object({
    name: nameSchema.optional(),
    totalAmount: positiveAmountSchema.optional(),
    totalInstallments: totalInstallmentsSchema.optional(),
    startDate: requiredDateSchema("Data da primeira parcela é obrigatória").optional(),
    endDate: optionalDateSchema.nullable().optional(),
    interestRate: interestRateSchema.nullable().optional(),
    categoryId: z.string().nullable().optional(),
    notes: notesSchema.nullable().optional(),
  })
  .refine(coversOneCentPerInstallment, {
    message: TOO_MANY_INSTALLMENTS_MESSAGE,
    path: ["totalAmount"],
  })
  .refine(endDateNotBeforeStart, { message: END_BEFORE_START_MESSAGE, path: ["endDate"] });

export type UpdateDebtInput = z.infer<typeof updateDebtInputSchema>;

export const payInstallmentInputSchema = z.object({
  paymentDate: requiredDateSchema("Data do pagamento é obrigatória"),
  paidAmount: positiveAmountSchema,
});

export type PayInstallmentInput = z.infer<typeof payInstallmentInputSchema>;
