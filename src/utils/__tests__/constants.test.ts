import { OrderStatus, POLLING_INTERVAL_MS } from '../constants';

describe('Constants', () => {
  describe('OrderStatus', () => {
    it('deve ter os valores corretos para cada status', () => {
      expect(OrderStatus.DRAFT).toBe(0);
      expect(OrderStatus.IN_PREPARATION).toBe(1);
      expect(OrderStatus.READY).toBe(2);
      expect(OrderStatus.FINISHED).toBe(3);
    });

    it('deve ter todos os status definidos', () => {
      const statuses = Object.values(OrderStatus).filter(
        (value) => typeof value === 'number'
      );
      expect(statuses).toHaveLength(4);
    });
  });

  describe('POLLING_INTERVAL_MS', () => {
    it('deve ter o valor de 10 segundos em milissegundos', () => {
      expect(POLLING_INTERVAL_MS).toBe(10000);
    });
  });
});

