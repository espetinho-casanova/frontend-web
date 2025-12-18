import { z } from "zod";

export const createAddonSchema = z.object({
  name: z.string().min(1, "Nome do adicional é obrigatório"),
  price: z.number().positive("Preço deve ser um número positivo"),
  image: z.string().optional(),
});

export const updateAddonSchema = z.object({
  name: z.string().min(1, "Nome do adicional é obrigatório").optional(),
  price: z.number().positive("Preço deve ser um número positivo").optional(),
  image: z.string().optional(),
});

