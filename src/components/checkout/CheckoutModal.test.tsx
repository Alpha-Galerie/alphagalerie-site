import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import CheckoutModal from './CheckoutModal';
import { useCartStore } from '../../store/cart';
import type { ItemCarrinho } from '../../types';
import { limparCacheCashback } from '../../lib/cashback';

const submitPedidoMock = vi.fn();

vi.mock('../../hooks/useCheckout', () => ({
  useCheckout: () => ({
    submitPedido: submitPedidoMock,
  }),
}));

vi.mock('../../lib/mercadopago', () => ({
  loadMercadoPago: vi.fn(),
}));

// Cupons vêm da tabela `cupons` via validar_cupom(). Antes eram uma lista
// fixa dentro deste componente, o que fazia cupom criado na retaguarda não
// existir para o cliente.
const rpcMock = vi.fn();

vi.mock('../../lib/supabase', () => ({
  supabase: {
    rpc: (...args: unknown[]) => rpcMock(...args),
  },
}));

const CUPONS_NO_BANCO: Record<string, { codigo: string; tipo: string; valor: number; descricao: string }> = {
  '5OFF': { codigo: '5OFF', tipo: 'pct', valor: 3, descricao: '3% de desconto' },
  ALPHA10: { codigo: 'ALPHA10', tipo: 'pct', valor: 10, descricao: '10% de desconto' },
  BEMVINDO: { codigo: 'BEMVINDO', tipo: 'fixo', valor: 15, descricao: 'R$ 15 de desconto' },
  FRETEGRATIS: { codigo: 'FRETEGRATIS', tipo: 'frete', valor: 0, descricao: 'Frete grátis' },
};

async function aplicarCupom(codigo: string) {
  fireEvent.change(screen.getByLabelText(/Cupom de desconto/i), { target: { value: codigo } });
  fireEvent.click(screen.getByRole('button', { name: /aplicar/i }));
}

vi.mock('./PixPayment', () => ({
  default: ({ onClose }: { onClose: () => void }) => {
    if (useCartStore.getState().items.length !== 0) {
      throw new Error('Cart not cleared before PixPayment render');
    }

    return (
      <div>
        <div>Pagamento via PIX</div>
        <button type="button" aria-label="Fechar pagamento PIX" onClick={onClose}>
          Fechar
        </button>
      </div>
    );
  },
}));

beforeEach(() => {
  vi.clearAllMocks();
  limparCacheCashback();
  rpcMock.mockImplementation(async (_fn: string, params: { p_codigo: string }) => {
    const c = CUPONS_NO_BANCO[String(params.p_codigo || '').trim().toUpperCase()];
    return { data: c ? [c] : [], error: null };
  });
  submitPedidoMock.mockResolvedValue({
    success: true,
    pedido: { id: 123 },
  });

  const item: ItemCarrinho = {
    id: 1,
    cartKey: '1',
    nome: 'Produto Teste',
    marca: 'Marca',
    categoria: 'Cat',
    preco: 100,
    imagem: null,
    estoque: 10,
    qtd: 1,
  };

  useCartStore.setState({ items: [item] });
});

afterEach(() => {
  useCartStore.setState({ items: [] });
});

function fillRequiredFields() {
  fireEvent.change(screen.getByLabelText(/Nome completo/i), {
    target: { value: 'Cliente Teste' },
  });
  fireEvent.change(screen.getByLabelText(/WhatsApp/i), {
    target: { value: '(11) 99999-9999' },
  });
  fireEvent.change(screen.getByLabelText(/CEP/i), {
    target: { value: '06454-700' },
  });
  fireEvent.change(screen.getByLabelText(/Rua \/ Avenida/i), {
    target: { value: 'Rua Teste' },
  });
}

describe('CheckoutModal', () => {
  it('creates order on submit and clears cart before PIX step', async () => {
    const onClose = vi.fn();
    render(<CheckoutModal onClose={onClose} />);

    fillRequiredFields();

    fireEvent.click(screen.getByRole('button', { name: /Confirmar pedido/i }));

    await waitFor(() => {
      expect(submitPedidoMock).toHaveBeenCalledTimes(1);
    });

    await waitFor(() => {
      expect(screen.getByText(/Pagamento via PIX/i)).toBeInTheDocument();
    });
  });

  it('aplica cupom consultando o banco, nao uma lista fixa', async () => {
    render(<CheckoutModal onClose={vi.fn()} />);

    await aplicarCupom('5off');

    await waitFor(() => {
      expect(rpcMock).toHaveBeenCalledWith('validar_cupom', expect.objectContaining({ p_codigo: '5OFF' }));
    });
    expect(await screen.findByText(/3% de desconto aplicado/i)).toBeInTheDocument();
    expect(await screen.findByText(/Cupom 5OFF/i)).toBeInTheDocument();
  });

  it('envia o subtotal para o banco poder checar valor minimo', async () => {
    render(<CheckoutModal onClose={vi.fn()} />);

    await aplicarCupom('5OFF');

    await waitFor(() => {
      const chamada = rpcMock.mock.calls.find(([fn]) => fn === 'validar_cupom');
      const params = chamada?.[1] as { p_subtotal: number };
      expect(params.p_subtotal).toBe(100);
    });
  });

  it('recusa cupom que nao existe no banco', async () => {
    render(<CheckoutModal onClose={vi.fn()} />);

    await aplicarCupom('NAOEXISTE');

    expect(await screen.findByText(/inválido ou expirado/i)).toBeInTheDocument();
    expect(screen.queryByText(/Cupom NAOEXISTE/i)).not.toBeInTheDocument();
  });

  it('nao quebra o checkout se a consulta ao banco falhar', async () => {
    rpcMock.mockImplementation(async (fn: string) =>
      fn === 'validar_cupom'
        ? { data: null, error: { message: 'network' } }
        : { data: [], error: null }
    );
    render(<CheckoutModal onClose={vi.fn()} />);

    await aplicarCupom('5OFF');

    expect(await screen.findByText(/inválido ou expirado/i)).toBeInTheDocument();
  });

  it('mantem funcionando os cupons que a loja ja aceitava', async () => {
    render(<CheckoutModal onClose={vi.fn()} />);

    await aplicarCupom('ALPHA10');
    expect(await screen.findByText(/10% de desconto aplicado/i)).toBeInTheDocument();

    await aplicarCupom('BEMVINDO');
    expect(await screen.findByText(/R\$ 15 de desconto aplicado/i)).toBeInTheDocument();

    await aplicarCupom('FRETEGRATIS');
    expect(await screen.findByText(/Frete grátis aplicado/i)).toBeInTheDocument();
  });

  it('aplica automaticamente o cupom vindo do popup de recuperacao', async () => {
    sessionStorage.setItem('ag_cupom_auto', 'ALPHA10');
    render(<CheckoutModal onClose={vi.fn()} />);

    await waitFor(() => {
      expect(rpcMock).toHaveBeenCalledWith('validar_cupom', expect.objectContaining({ p_codigo: 'ALPHA10' }));
    });
    expect(await screen.findByText(/10% de desconto aplicado/i, undefined, { timeout: 3000 })).toBeInTheDocument();
    expect(sessionStorage.getItem('ag_cupom_auto')).toBeNull();
  });

  it('closes modal from PIX step without resubmitting', async () => {
    const onClose = vi.fn();
    render(<CheckoutModal onClose={onClose} />);

    fillRequiredFields();

    fireEvent.click(screen.getByRole('button', { name: /Confirmar pedido/i }));

    await screen.findByText(/Pagamento via PIX/i);

    fireEvent.click(screen.getByRole('button', { name: /Fechar pagamento PIX/i }));

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(submitPedidoMock).toHaveBeenCalledTimes(1);
  });
});

describe('CheckoutModal com cashback', () => {
  beforeEach(() => {
    rpcMock.mockImplementation(async (fn: string) => {
      if (fn === 'cashback_regras') {
        return { data: [{ percentual: 100, validade_dias: 30, uso_max_percentual: 50 }], error: null };
      }
      if (fn === 'consultar_cashback') {
        return {
          data: [{ saldo: 120, proximo_vencimento: '2026-10-24T02:59:59Z', valor_vencendo: 120 }],
          error: null,
        };
      }
      return { data: [], error: null };
    });
  });

  it('mostra o saldo, abate até metade dos produtos e pede ao banco para usar', async () => {
    submitPedidoMock.mockResolvedValue({ success: true, pedido: { id: 123, total: 97.5 } });
    render(<CheckoutModal onClose={vi.fn()} />);
    fillRequiredFields();

    // Produto 100, Pix −5 → 95 em produtos; teto de 50% → 47,50 de cashback.
    expect(await screen.findByText(/Usar R\$\s?47,50 neste pedido/i, undefined, { timeout: 3000 })).toBeInTheDocument();
    expect(screen.getByText(/Cashback usado/i)).toBeInTheDocument();
    expect(screen.getByText(/Você ganha/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Confirmar pedido/i }));

    await waitFor(() => expect(submitPedidoMock).toHaveBeenCalledTimes(1));
    const [dados] = submitPedidoMock.mock.calls[0];
    // O total vai cheio (95 + frete 50); o banco abate e devolve o final.
    expect(dados).toMatchObject({ usarCashback: true, total: 145, frete: 50 });
    expect(rpcMock).toHaveBeenCalledWith('consultar_cashback', { p_whatsapp: '11999999999' });
  });

  it('cliente pode deixar o cashback para depois', async () => {
    render(<CheckoutModal onClose={vi.fn()} />);
    fillRequiredFields();

    const usar = await screen.findByRole('checkbox', { name: /Usar R\$/i }, { timeout: 3000 });
    fireEvent.click(usar);
    expect(screen.queryByText(/Cashback usado/i)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Confirmar pedido/i }));
    await waitFor(() => expect(submitPedidoMock).toHaveBeenCalledTimes(1));
    expect(submitPedidoMock.mock.calls[0][0]).toMatchObject({ usarCashback: false });
  });

  it('sem o programa no ar, o pedido sai como antes', async () => {
    rpcMock.mockImplementation(async () => ({ data: null, error: { message: 'function not found' } }));
    render(<CheckoutModal onClose={vi.fn()} />);
    fillRequiredFields();

    fireEvent.click(screen.getByRole('button', { name: /Confirmar pedido/i }));
    await waitFor(() => expect(submitPedidoMock).toHaveBeenCalledTimes(1));
    expect(submitPedidoMock.mock.calls[0][0].usarCashback).toBeUndefined();
    expect(screen.queryByText(/cashback/i)).not.toBeInTheDocument();
  });
});
