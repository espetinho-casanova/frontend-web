import { createOrderSchema } from '../orderValidations';

describe('orderValidations', () => {
  describe('createOrderSchema', () => {
    it('deve validar um pedido válido com itens', () => {
      const validOrder = {
        table: 1,
        name: 'Cliente Teste',
        items: [
          {
            productId: 1,
            amount: 2,
          },
        ],
      };

      const result = createOrderSchema.safeParse(validOrder);
      expect(result.success).toBe(true);
    });

    it('deve validar um pedido sem mesa e nome', () => {
      const validOrder = {
        items: [
          {
            productId: 1,
            amount: 1,
          },
        ],
      };

      const result = createOrderSchema.safeParse(validOrder);
      expect(result.success).toBe(true);
    });

    it('deve rejeitar pedido sem itens', () => {
      const invalidOrder = {
        table: 1,
        name: 'Cliente',
        items: [],
      };

      const result = createOrderSchema.safeParse(invalidOrder);
      expect(result.success).toBe(false);
      if (!result.success && result.error.errors && result.error.errors.length > 0) {
        const errorMessage = result.error.errors[0].message;
        expect(errorMessage).toContain('pelo menos um item');
      }
    });

    it('deve rejeitar item com productId inválido', () => {
      const invalidOrder = {
        items: [
          {
            productId: -1, // ID negativo
            amount: 1,
          },
        ],
      };

      const result = createOrderSchema.safeParse(invalidOrder);
      expect(result.success).toBe(false);
    });

    it('deve rejeitar item com quantidade inválida', () => {
      const invalidOrder = {
        items: [
          {
            productId: 1,
            amount: 0, // Quantidade zero
          },
        ],
      };

      const result = createOrderSchema.safeParse(invalidOrder);
      expect(result.success).toBe(false);
    });

    it('deve validar meatPoint corretamente', () => {
      const validOrder = {
        items: [
          {
            productId: 1,
            amount: 1,
            meatPoint: 'ao ponto',
          },
        ],
      };

      const result = createOrderSchema.safeParse(validOrder);
      expect(result.success).toBe(true);
    });

    it('deve rejeitar meatPoint inválido', () => {
      const invalidOrder = {
        items: [
          {
            productId: 1,
            amount: 1,
            meatPoint: 'muito passado', // Valor inválido
          },
        ],
      };

      const result = createOrderSchema.safeParse(invalidOrder);
      expect(result.success).toBe(false);
    });

    it('deve validar adicionais como array de números', () => {
      const validOrder = {
        items: [
          {
            productId: 1,
            amount: 1,
            additions: [1, 2, 3],
          },
        ],
      };

      const result = createOrderSchema.safeParse(validOrder);
      expect(result.success).toBe(true);
    });
  });
});

