import { z } from "zod";

export const authUserSchema = z.object({
  login: z.string().min(1, "Login é obrigatório"),
  password: z.string().min(1, "Senha é obrigatória"),
});

export const createUserSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  login: z.string().min(3, "Login deve ter pelo menos 3 caracteres"),
  password: z.string().min(6, "Senha deve ter pelo menos 6 caracteres"),
  roleId: z
    .union([
      z.string().uuid("Cargo inválido"),
      z.literal(""),
      z.null(),
    ])
    .optional()
    .transform((val) => (val === "" ? null : val)),
});

export const updateUserSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  login: z.string().min(3, "Login deve ter pelo menos 3 caracteres"),
  password: z
    .union([
      z.string().min(6, "Senha deve ter pelo menos 6 caracteres"),
      z.literal(""),
    ])
    .optional(),
  roleId: z
    .union([
      z.string().uuid("Cargo inválido"),
      z.literal(""),
      z.null(),
    ])
    .optional()
    .transform((val) => (val === "" ? null : val)),
});

