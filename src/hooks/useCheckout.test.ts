import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useCheckout } from './useCheckout';
import type { Pedido } from '../types';

const rpcMock = vi.fn();

vi.mock('../lib/supabase', () => ({
  supabase: { rpc: (...args: unknown[]) => rpcMock(...args) },
}));

beforeEach(() => {
  rpcMock.mockReset();
  rpcMock.mockResolvedValue({ data: { success: true, id: 1, total: 10 }, error: null });
});

describe('useCheckout', () => {
  it('grava o endereço com cada parte uma vez só', async () => {
    const pedido: Pedido = {
      nome: 'Cliente', telefone: '(11) 99999-9999',
      endereco: 'Avenida Sagitário, 278', complemento: 'Apto 145 A1',
      bairro: 'Sítio Tamboré Alphaville', cidade: 'Barueri', cep: '06473-073',
      pagamento: 'pix', entrega: 'delivery', total: 10, status: 'pendente', itens: [],
    };

    await useCheckout().submitPedido(pedido, []);

    expect(rpcMock).toHaveBeenCalledWith('create_order_with_items', expect.objectContaining({
      p_cliente_endereco: 'Avenida Sagitário, 278, Apto 145 A1, Sítio Tamboré Alphaville, Barueri, 06473-073',
    }));
  });
});
