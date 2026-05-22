import { supabase } from '../supabase';
import type { CheckoutProvider, CheckoutPreference } from './types';

export const proCheckout: CheckoutProvider = {
  mode: 'pro',

  async startCheckout(pedido: CheckoutPreference) {
    const { data, error } = await supabase.functions.invoke('create-preference', {
      body: {
        pedido_id: pedido.pedido_id,
        items: pedido.items,
        total: pedido.total,
        email: pedido.email,
      },
    });

    if (error || !data?.init_point) {
      console.error('Erro ao criar preference:', error);
      return { error: 'Erro ao iniciar checkout. Tente novamente.' };
    }

    window.location.href = data.init_point;
    return { redirectUrl: data.init_point };
  },
};
