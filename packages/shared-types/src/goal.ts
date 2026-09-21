import { z } from "zod";

import { workspaceTypeSchema } from "./auth";
import { nonNegativeAmountSchema, positiveAmountSchema } from "./money";

export const goalSchema = z.object({
  id: z.string(),
  workspace: workspaceTypeSchema,
  categoryId: z.string().nullable(),
  title: z.string(),
  description: z.string().nullable(),
  targetAmount: z.string(),
  currentAmount: z.string(),
  targetDate: z.string().nullable(),
  completed: z.boolean(),
  // Computed server-side, clamped 0-100 — not stored.
  progressPercent: z.number(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type Goal = z.infer<typeof goalSchema>;

// Validation messages here render as inline form errors in the mobile UI,
// so they're pt-BR — see docs/steering/tech.md "Language policy".
export const createGoalInputSchema = z.object({
  title: z
    .string()
    .min(1, "Título é obrigatório")
    .max(100, "Título deve ter no máximo 100 caracteres"),
  description: z.string().max(500, "Descrição deve ter no máximo 500 caracteres").optional(),
  targetAmount: positiveAmountSchema,
  currentAmount: nonNegativeAmountSchema.optional(),
  targetDate: z.string().optional(),
  categoryId: z.string().optional(),
});

export type CreateGoalInput = z.infer<typeof createGoalInputSchema>;

// `completed` is only settable on update — matches legacy (never sent on
// creation, only from the edit/progress-update forms).
export const updateGoalInputSchema = z.object({
  title: z
    .string()
    .min(1, "Título é obrigatório")
    .max(100, "Título deve ter no máximo 100 caracteres")
    .optional(),
  description: z.string().max(500, "Descrição deve ter no máximo 500 caracteres").optional(),
  targetAmount: positiveAmountSchema.optional(),
  currentAmount: nonNegativeAmountSchema.optional(),
  targetDate: z.string().optional(),
  categoryId: z.string().optional(),
  completed: z.boolean().optional(),
});

export type UpdateGoalInput = z.infer<typeof updateGoalInputSchema>;
