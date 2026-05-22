// src/lib/checkout/checkout.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock do supabase antes de importar os providers
vi.mock('../../lib/supabase', () => ({
  supabase: {
    functions: {
      invoke: vi.fn(),
    },
  },
}));

// Mock do mercadopago
vi.mock('../../lib/mercadopago', () => ({
  loadMercadoPago: vi.fn().mockResolvedValue({}),
}));

describe('Checkout Providers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset do módulo para recarregar com nova env
    vi.resetModules();
  });

  describe('transparentCheckout', () => {
    it('mode should be transparent', async () => {
      const { transparentCheckout } = await import('./transparent');
      expect(transparentCheckout.mode).toBe('transparent');
    });

    it('startCheckout should not redirect', async () => {
      const { transparentCheckout } = await import('./transparent');
      const result = await transparentCheckout.startCheckout({
        pedido_id: 'test',
        items: [],
        total: 100,
      });
      expect(result.redirectUrl).toBeUndefined();
      expect(result.error).toBeUndefined();
    });
  });

  describe('proCheckout', () => {
    it('mode should be pro', async () => {
      const { proCheckout } = await import('./pro');
      expect(proCheckout.mode).toBe('pro');
    });
  });
});
