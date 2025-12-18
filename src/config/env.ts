import { z } from "zod";

const envSchema = z.object({
    NEXT_PUBLIC_API_URL: z
        .string()
        .url("NEXT_PUBLIC_API_URL deve ser uma URL válida")
        .default("http://localhost:3333"),
    NEXT_PUBLIC_COOKIE_NAME: z
        .string()
        .min(1, "NEXT_PUBLIC_COOKIE_NAME não pode estar vazio")
        .default("@es-casanova.token"),
    NEXT_PUBLIC_COOKIE_MAX_AGE: z
        .string()
        .regex(/^\d+$/, "NEXT_PUBLIC_COOKIE_MAX_AGE deve ser um número")
        .default("2592000")
        .transform((val) => Number.parseInt(val, 10))
        .refine((val) => val > 0, "NEXT_PUBLIC_COOKIE_MAX_AGE deve ser maior que 0"),
});

function validateEnv() {
    try {
        return envSchema.parse({
            NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
            NEXT_PUBLIC_COOKIE_NAME: process.env.NEXT_PUBLIC_COOKIE_NAME,
            NEXT_PUBLIC_COOKIE_MAX_AGE: process.env.NEXT_PUBLIC_COOKIE_MAX_AGE,
        });
    } catch (error) {
        if (error instanceof z.ZodError) {
            const missingVars = error.issues.map((err) => {
                const path = err.path.join(".");
                return `  - ${path}: ${err.message}`;
            }).join("\n");

            console.error(
                `❌ Variáveis de ambiente inválidas ou faltando:\n${missingVars}\n\n` +
                `Por favor, verifique seu arquivo .env e certifique-se de que todas as variáveis estão configuradas corretamente.`
            );

            return {
                NEXT_PUBLIC_API_URL: "http://localhost:3333",
                NEXT_PUBLIC_COOKIE_NAME: "@es-casanova.token",
                NEXT_PUBLIC_COOKIE_MAX_AGE: 2592000,
            };
        }
        throw error;
    }
}

export const env = validateEnv();

