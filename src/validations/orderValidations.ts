import { z } from "zod";

const orderItemSchema = z.object({
  productId: z.number().int().positive("ID do produto deve ser um número positivo"),
  amount: z.number().int().positive("Quantidade deve ser um número positivo"),
  meatChoiceId: z.number().int().positive().optional(),
  meatPoint: z.enum(["mal", ". pra mal", "ao ponto", ". pra bem", "bem"]).optional(),
  removals: z.array(z.string()).optional(),
  additions: z.array(z.number().int().positive()).optional(),
  notes: z.string().optional(),
});

export const createOrderSchema = z.object({
  table: z.string().min(1, "Mesa/Nome é obrigatório"),
  status: z.number().int().min(0).max(3).optional(),
  draft: z.boolean().optional(),
  items: z.array(orderItemSchema).min(1, "Adicione pelo menos um item ao pedido"),
});

