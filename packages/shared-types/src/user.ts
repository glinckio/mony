import { z } from "zod";

import { workspaceTypeSchema } from "./auth";

export type { WorkspaceType } from "./auth";

// Validation messages here render as inline form errors in the mobile UI,
// so they're pt-BR — see docs/steering/tech.md "Language policy".
const phoneSchema = z.preprocess(
  (value) => (value === "" ? undefined : value),
  z
    .string()
    .regex(/^\d{10,11}$/, "Telefone deve ter 10 ou 11 dígitos")
    .optional(),
);

export const profileSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string(),
  phone: z.string().nullable(),
  phone2: z.string().nullable(),
  activeWorkspace: workspaceTypeSchema,
  createdAt: z.string(),
  lastAccessAt: z.string().nullable(),
});

export type Profile = z.infer<typeof profileSchema>;

export const updateProfileInputSchema = z.object({
  name: z
    .string()
    .min(1, "Nome é obrigatório")
    .max(100, "Nome deve ter no máximo 100 caracteres")
    .optional(),
  email: z.string().email("E-mail inválido").max(100, "E-mail muito longo").optional(),
  phone: phoneSchema,
  phone2: phoneSchema,
});

export type UpdateProfileInput = z.infer<typeof updateProfileInputSchema>;

export const changePasswordInputSchema = z
  .object({
    currentPassword: z.string().min(1, "Senha atual é obrigatória"),
    newPassword: z
      .string()
      .min(8, "Senha deve ter no mínimo 8 caracteres")
      .max(72, "Senha muito longa"),
    newPasswordConfirmation: z.string(),
  })
  .refine((data) => data.newPassword === data.newPasswordConfirmation, {
    message: "As senhas não coincidem",
    path: ["newPasswordConfirmation"],
  });

export type ChangePasswordInput = z.infer<typeof changePasswordInputSchema>;

export const switchWorkspaceInputSchema = z.object({
  workspace: workspaceTypeSchema,
});

export type SwitchWorkspaceInput = z.infer<typeof switchWorkspaceInputSchema>;
