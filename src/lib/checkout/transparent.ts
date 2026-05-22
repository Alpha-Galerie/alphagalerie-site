// src/lib/checkout/transparent.ts
import type { CheckoutProvider, CheckoutPreference } from './types';
import { loadMercadoPago } from '../mercadopago';

export const transparentCheckout: CheckoutProvider = {
  mode: 'transparent',

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async startCheckout(_pedido: CheckoutPreference) {
    // O fluxo transparente usa CardPayment.tsx diretamente
    // Este provider existe apenas para interface consistente
    await loadMercadoPago();
    return { redirectUrl: undefined };
  },
};
