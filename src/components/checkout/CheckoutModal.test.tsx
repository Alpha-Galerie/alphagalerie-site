import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import CheckoutModal from './CheckoutModal';
import { useCartStore } from '../../store/cart';
import type { ItemCarrinho } from '../../types';
import { limparCacheClube } from '../../lib/clube';

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
  limparCacheClube();
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

const REGRAS_CLUBE = {
  ativo: true, nome: 'Alpha Club', pontos_por_real: 1, valor_ponto: 0.1, validade_dias: 365,
  checkout_max_percentual: 10, cupom_valores: [5, 10], cupom_validade_dias: 30,
  cupom_minimo_multiplicador: 3, bonus_boas_vindas: 50, bonus_aniversario: 100, bonus_indicacao: 100,
};

function clubeNoBanco(opcoes: { regras?: object | null; saldo?: object } = {}) {
  const regras = opcoes.regras === undefined ? REGRAS_CLUBE : opcoes.regras;
  const saldo = {
    participante: true, pontos: 250, valor: 25, proximo_vencimento: '2027-09-25T03:00:00Z',
    pontos_vencendo: 250, aniversario_pontos: 0, tem_aniversario: true, cupons: [],
    ...(opcoes.saldo ?? {}),
  };
  rpcMock.mockImplementation(async (fn: string, params: { p_codigo?: string }) => {
    if (fn === 'clube_regras') {
      return regras ? { data: [regras], error: null } : { data: null, error: { message: 'function not found' } };
    }
    if (fn === 'consultar_clube') return { data: saldo, error: null };
    if (fn === 'validar_cupom') {
      const codigo = String(params.p_codigo || '').trim().toUpperCase();
      if (codigo === 'CLUBE-ABC123') {
        return { data: [{ codigo, tipo: 'fixo', valor: 10, descricao: 'Alpha Club: R$ 10,00 de desconto' }], error: null };
      }
      const c = CUPONS_NO_BANCO[codigo];
      return { data: c ? [c] : [], error: null };
    }
    return { data: [], error: null };
  });
}

describe('CheckoutModal com o Alpha Club', () => {
  beforeEach(() => {
    const promocao: ItemCarrinho = {
      id: 2, cartKey: '2', nome: 'Piteira em promoção', marca: 'Marca', categoria: 'Cat',
      preco: 50, imagem: null, estoque: 10, qtd: 1, promocional: true,
    };
    useCartStore.setState({ items: [...useCartStore.getState().items, promocao] });
  });

  it('mostra os pontos, usa até 10% dos produtos fora de promoção e pede ao banco', async () => {
    clubeNoBanco();
    submitPedidoMock.mockResolvedValue({ success: true, pedido: { id: 123, total: 182.5, pontos_usados: 100 } });
    render(<CheckoutModal onClose={vi.fn()} />);
    fillRequiredFields();

    // Fora de promoção só o produto de R$ 100 → 10% = R$ 10 = 100 pontos.
    expect(await screen.findByText(/Usar 100 pontos \(− R\$\s?10,00\)/i, undefined, { timeout: 3000 })).toBeInTheDocument();
    expect(screen.getAllByText(/250 pontos/).length).toBeGreaterThan(0);
    expect(screen.getByText(/Alpha Club \(100 pontos\)/)).toBeInTheDocument();
    expect(screen.getByText(/Você ganha/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Confirmar pedido/i }));
    await waitFor(() => expect(submitPedidoMock).toHaveBeenCalledTimes(1));
    // R$ 150 − Pix 5% (7,50) + frete 50: o total vai sem os pontos; o banco abate.
    expect(submitPedidoMock.mock.calls[0][0]).toMatchObject({ usarCashback: true, total: 192.5, frete: 50 });
    expect(rpcMock).toHaveBeenCalledWith('consultar_clube', { p_whatsapp: '11999999999' });
  });

  it('cupom e pontos não somam: com cupom, os pontos saem', async () => {
    clubeNoBanco();
    render(<CheckoutModal onClose={vi.fn()} />);
    fillRequiredFields();
    await screen.findByText(/Usar 100 pontos/i, undefined, { timeout: 3000 });

    await aplicarCupom('ALPHA10');
    expect(await screen.findByText(/Pontos não somam com cupom/i)).toBeInTheDocument();
    expect(screen.queryByText(/Alpha Club \(100 pontos\)/)).not.toBeInTheDocument();
    expect(rpcMock).toHaveBeenCalledWith('validar_cupom', expect.objectContaining({ p_codigo: 'ALPHA10', p_whatsapp: '(11) 99999-9999' }));

    fireEvent.click(screen.getByRole('button', { name: /Confirmar pedido/i }));
    await waitFor(() => expect(submitPedidoMock).toHaveBeenCalledTimes(1));
    expect(submitPedidoMock.mock.calls[0][0]).toMatchObject({ usarCashback: false, cupomCodigo: 'ALPHA10' });
  });

  it('cliente pode guardar os pontos para depois', async () => {
    clubeNoBanco();
    render(<CheckoutModal onClose={vi.fn()} />);
    fillRequiredFields();

    fireEvent.click(await screen.findByRole('checkbox', { name: /Usar 100 pontos/i }, { timeout: 3000 }));
    expect(screen.queryByText(/Alpha Club \(100 pontos\)/)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Confirmar pedido/i }));
    await waitFor(() => expect(submitPedidoMock).toHaveBeenCalledTimes(1));
    expect(submitPedidoMock.mock.calls[0][0]).toMatchObject({ usarCashback: false });
  });

  it('primeira compra: boas-vindas, aniversário e indicação vão para o banco', async () => {
    clubeNoBanco({ saldo: { participante: false, pontos: 0, valor: 0, tem_aniversario: false, pontos_vencendo: 0, proximo_vencimento: null } });
    render(<CheckoutModal onClose={vi.fn()} />);
    fillRequiredFields();

    expect(await screen.findByText(/Primeira compra\? Você entra no Alpha Club e ganha 50 pontos/i, undefined, { timeout: 3000 })).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText(/Aniversário/i), { target: { value: '1503' } });
    fireEvent.change(screen.getByLabelText(/Quem te indicou/i), { target: { value: '11988887777' } });

    fireEvent.click(screen.getByRole('button', { name: /Confirmar pedido/i }));
    await waitFor(() => expect(submitPedidoMock).toHaveBeenCalledTimes(1));
    expect(submitPedidoMock.mock.calls[0][0]).toMatchObject({
      aniversario: '15/03',
      indicadoPor: '(11) 98888-7777',
      usarCashback: false,
    });
  });

  it('aniversário inválido segura o pedido', async () => {
    clubeNoBanco({ saldo: { participante: false, pontos: 0, tem_aniversario: false } });
    render(<CheckoutModal onClose={vi.fn()} />);
    fillRequiredFields();

    fireEvent.change(await screen.findByLabelText(/Aniversário/i, undefined, { timeout: 3000 }), { target: { value: '3202' } });
    fireEvent.click(screen.getByRole('button', { name: /Confirmar pedido/i }));
    expect((await screen.findAllByText(/Aniversário no formato dia\/mês/i)).length).toBeGreaterThan(0);
    expect(submitPedidoMock).not.toHaveBeenCalled();
  });

  it('cupom do clube aparece para o dono e é aplicado com o WhatsApp', async () => {
    clubeNoBanco({ saldo: { cupons: [{ codigo: 'CLUBE-ABC123', valor: 10, validade: '2026-10-24', valor_minimo: 30 }] } });
    render(<CheckoutModal onClose={vi.fn()} />);
    fillRequiredFields();

    fireEvent.click(await screen.findByRole('button', { name: /Usar cupom CLUBE-ABC123/i }, { timeout: 3000 }));
    await waitFor(() => {
      expect(rpcMock).toHaveBeenCalledWith('validar_cupom', expect.objectContaining({ p_codigo: 'CLUBE-ABC123', p_whatsapp: '(11) 99999-9999' }));
    });
    expect(await screen.findByText(/Cupom CLUBE-ABC123/)).toBeInTheDocument();
  });

  it('clube pausado na retaguarda: nada aparece, mas o cupom vai para o banco conferir', async () => {
    clubeNoBanco({ regras: { ...REGRAS_CLUBE, ativo: false } });
    render(<CheckoutModal onClose={vi.fn()} />);
    fillRequiredFields();
    await aplicarCupom('ALPHA10');
    await screen.findByText(/10% de desconto aplicado/i);

    fireEvent.click(screen.getByRole('button', { name: /Confirmar pedido/i }));
    await waitFor(() => expect(submitPedidoMock).toHaveBeenCalledTimes(1));
    expect(submitPedidoMock.mock.calls[0][0]).toMatchObject({ usarCashback: false, cupomCodigo: 'ALPHA10' });
    expect(screen.queryByText(/Alpha Club/)).not.toBeInTheDocument();
  });

  it('banco sem o clube: o pedido sai como antes', async () => {
    clubeNoBanco({ regras: null });
    render(<CheckoutModal onClose={vi.fn()} />);
    fillRequiredFields();

    fireEvent.click(screen.getByRole('button', { name: /Confirmar pedido/i }));
    await waitFor(() => expect(submitPedidoMock).toHaveBeenCalledTimes(1));
    expect(submitPedidoMock.mock.calls[0][0].usarCashback).toBeUndefined();
    expect(rpcMock).not.toHaveBeenCalledWith('consultar_clube', expect.anything());
  });
});
