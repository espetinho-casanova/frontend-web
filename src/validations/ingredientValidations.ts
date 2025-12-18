import { z } from "zod";

export const createIngredientSchema = z.object({
  name: z.string().min(1, "Nome do ingrediente é obrigatório"),
  nonRemovable: z.boolean().optional(),
});

export const updateIngredientSchema = z.object({
  name: z.string().min(1, "Nome do ingrediente é obrigatório").optional(),
  nonRemovable: z.boolean().optional(),
});

