import { z } from "zod";

export const workspaceTypeSchema = z.enum(["PERSONAL", "BUSINESS"]);
export type WorkspaceType = z.infer<typeof workspaceTypeSchema>;

// Validation messages here render as inline form errors in the mobile UI,
// so they're pt-BR — see docs/steering/tech.md "Language policy".
export const registerInputSchema = z
  .object({
    name: z
      .string()
      .min(1, "Nome é obrigatório")
      .max(100, "Nome deve ter no máximo 100 caracteres"),
    email: z.string().email("E-mail inválido").max(100, "E-mail muito longo"),
    password: z
      .string()
      .min(8, "Senha deve ter no mínimo 8 caracteres")
      .max(72, "Senha muito longa"),
    passwordConfirmation: z.string(),
    phone: z.preprocess(
      (value) => (value === "" ? undefined : value),
      z
        .string()
        .regex(/^\d{10,11}$/, "Telefone deve ter 10 ou 11 dígitos")
        .optional(),
    ),
  })
  .refine((data) => data.password === data.passwordConfirmation, {
    message: "As senhas não coincidem",
    path: ["passwordConfirmation"],
  });

export type RegisterInput = z.infer<typeof registerInputSchema>;

export const loginInputSchema = z.object({
  email: z.string().email("E-mail inválido"),
  password: z.string().min(1, "Senha é obrigatória"),
});

export type LoginInput = z.infer<typeof loginInputSchema>;

export const requestResetInputSchema = z.object({
  email: z.string().email("E-mail inválido"),
});

export type RequestResetInput = z.infer<typeof requestResetInputSchema>;

export const confirmResetInputSchema = z
  .object({
    email: z.string().email("E-mail inválido"),
    code: z.string().regex(/^\d{6}$/, "Código deve ter 6 dígitos"),
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

export type ConfirmResetInput = z.infer<typeof confirmResetInputSchema>;

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    name: string;
    email: string;
    activeWorkspace: WorkspaceType;
  };
}
