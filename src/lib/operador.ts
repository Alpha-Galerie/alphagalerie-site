import { supabase } from './supabase';
import { formatCurrency } from './format';
import { getPrecoInfo, precoNoPagamento } from './preco';

/**
 * Painel do operador (/operador): quem toca o online no dia a dia vê os
 * pedidos para separar e entregar, o estoque e lança pedido manual do
 * WhatsApp. Faturamento e relatórios ficam só na retaguarda do dono — as
 * funções do banco (migração 20261019000000_painel_operador.sql) nem devolvem
 * total dos pedidos.
 */

export type TipoEntrega = 'delivery' | 'programada' | 'retirada';

export interface ItemPedidoOperador {
  nome: string;
  variacao: string | null;
  codigo: string | null;
  quantidade: number;
}

export interface PedidoOperador {
  id: number;
  numero: string;
  criado_em: string;
  status: string;
  status_nome: string;
  status_cor: string | null;
  /** Grupo do status (pago, enviado, entregue, aguardando_pagamento…). */
  base: string;
  origem: 'site' | 'operador';
  cliente_nome: string;
  cliente_whatsapp: string;
  cliente_endereco: string | null;
  tipo_entrega: string | null;
  forma_pagamento: string | null;
  observacoes: string | null;
  /** Só no pedido manual aguardando Pix, para reenviar a cobrança. */
  valor_pix: number | null;
  itens: ItemPedidoOperador[];
}

export interface VariacaoOperador {
  id: number;
  nome: string;
  preco: number | null;
  estoque: number;
}

export interface ProdutoOperador {
  id: number;
  codigo: string | null;
  nome: string;
  marca: string | null;
  subcategoria: string | null;
  preco: number;
  preco_pix: number | null;
  preco_promocional: number | null;
  /** NULL = produto sem controle de estoque. */
  estoque: number | null;
  imagem_url: string | null;
  variacoes: VariacaoOperador[];
}

export interface LinhaPedidoManual {
  produto: ProdutoOperador;
  variacao: VariacaoOperador | null;
  quantidade: number;
}

export interface NovoPedidoManual {
  cliente_nome: string;
  cliente_whatsapp: string;
  cliente_endereco: string;
  tipo_entrega: TipoEntrega;
  frete: number;
  observacoes: string;
  linhas: LinhaPedidoManual[];
}

export interface PedidoManualCriado {
  id: number;
  numero: string;
  subtotal: number;
  frete: number;
  total: number;
  itens: Array<{
    produto_nome: string;
    variacao: string | null;
    quantidade: number;
    preco_unitario: number;
    subtotal: number;
  }>;
}

export const ENTREGA_LABEL: Record<string, string> = {
  delivery: 'Delivery',
  programada: 'Entrega programada',
  retirada: 'Retirada',
  entrega: 'Entrega',
};

/** Papéis que abrem o painel: o operador e o dono (admin), para conferir. */
export function podeUsarPainel(role: unknown): boolean {
  return role === 'operador' || role === 'admin';
}

/** Preço no Pix — a mesma regra do site, que o banco repete ao gravar. */
export function precoPixOperador(produto: ProdutoOperador, variacao: VariacaoOperador | null): number {
  const info = getPrecoInfo(produto, variacao);
  return precoNoPagamento({ preco: info.precoVenda, precoPix: info.precoPix ?? undefined }, 'pix');
}

/** Quanto ainda dá para vender: variação manda; NULL = sem controle. */
export function disponivel(produto: ProdutoOperador, variacao: VariacaoOperador | null): number | null {
  return variacao ? variacao.estoque : produto.estoque;
}

export function subtotalLinhas(linhas: LinhaPedidoManual[]): number {
  return linhas.reduce((acc, l) => acc + precoPixOperador(l.produto, l.variacao) * l.quantidade, 0);
}

/** Link do WhatsApp do cliente. Número brasileiro sem DDI ganha o 55. */
export function linkWhatsApp(telefone: string, texto?: string): string {
  let digitos = telefone.replace(/\D/g, '');
  if (digitos.length === 10 || digitos.length === 11) digitos = `55${digitos}`;
  const base = `https://wa.me/${digitos}`;
  return texto ? `${base}?text=${encodeURIComponent(texto)}` : base;
}

/** Mensagem da cobrança do pedido manual, com o Pix copia e cola no fim. */
export function mensagemCobranca(
  nomeCliente: string,
  pedido: Pick<PedidoManualCriado, 'numero' | 'frete' | 'total' | 'itens'>,
  pixCopiaECola: string
): string {
  const primeiroNome = nomeCliente.trim().split(/\s+/)[0] ?? '';
  const linhas = pedido.itens.map((i) => {
    const nome = i.variacao ? `${i.produto_nome} (${i.variacao})` : i.produto_nome;
    return `• ${i.quantidade}x ${nome} — ${formatCurrency(i.subtotal)}`;
  });
  return [
    `Olá${primeiroNome ? `, ${primeiroNome}` : ''}! Seu pedido na Alpha Galerie (${pedido.numero}):`,
    '',
    ...linhas,
    ...(pedido.frete > 0 ? [`Frete: ${formatCurrency(pedido.frete)}`] : []),
    `*Total no Pix: ${formatCurrency(pedido.total)}*`,
    '',
    'Pague pelo Pix copia e cola abaixo. Assim que o pagamento cair, a gente separa e envia.',
    '',
    pixCopiaECola,
  ].join('\n');
}

/** Mensagem curta para reenviar a cobrança de um manual aguardando Pix. */
export function mensagemReenvio(pedido: Pick<PedidoOperador, 'cliente_nome' | 'numero'>, valor: number, pixCopiaECola: string): string {
  const primeiroNome = pedido.cliente_nome.trim().split(/\s+/)[0] ?? '';
  return [
    `Olá${primeiroNome ? `, ${primeiroNome}` : ''}! Segue de novo o Pix do seu pedido ${pedido.numero}:`,
    `*Total: ${formatCurrency(valor)}*`,
    '',
    pixCopiaECola,
  ].join('\n');
}

// ── chamadas ao banco ──────────────────────────────────────────────────────

interface RespostaRpc {
  success: boolean;
  error?: string;
}

export async function buscarPedidosOperador(dias = 30): Promise<PedidoOperador[]> {
  const { data, error } = await supabase.rpc('operador_pedidos', { p_dias: dias });
  if (error) throw new Error(error.message);
  return (data ?? []) as PedidoOperador[];
}

export async function buscarProdutosOperador(): Promise<ProdutoOperador[]> {
  const { data, error } = await supabase.rpc('operador_produtos');
  if (error) throw new Error(error.message);
  return (data ?? []) as ProdutoOperador[];
}

export async function mudarStatusOperador(pedidoId: number, status: string): Promise<void> {
  const { data, error } = await supabase.rpc('operador_mudar_status', {
    p_pedido: pedidoId,
    p_status: status,
  });
  if (error) throw new Error(error.message);
  const r = data as RespostaRpc;
  if (!r?.success) throw new Error(r?.error ?? 'Não foi possível mudar o status.');
}

export async function criarPedidoManual(novo: NovoPedidoManual): Promise<PedidoManualCriado> {
  const { data, error } = await supabase.rpc('operador_criar_pedido', {
    p: {
      cliente_nome: novo.cliente_nome,
      cliente_whatsapp: novo.cliente_whatsapp,
      cliente_endereco: novo.cliente_endereco,
      tipo_entrega: novo.tipo_entrega,
      frete: novo.tipo_entrega === 'retirada' ? 0 : novo.frete,
      observacoes: novo.observacoes,
      itens: novo.linhas.map((l) => ({
        produto_id: l.produto.id,
        variacao_id: l.variacao?.id ?? null,
        quantidade: l.quantidade,
      })),
    },
  });
  if (error) throw new Error(error.message);
  const r = data as RespostaRpc & Partial<PedidoManualCriado>;
  if (!r?.success) throw new Error(r?.error ?? 'Não foi possível criar o pedido.');
  return {
    id: r.id as number,
    numero: r.numero as string,
    subtotal: Number(r.subtotal),
    frete: Number(r.frete),
    total: Number(r.total),
    itens: (r.itens ?? []).map((i) => ({ ...i, preco_unitario: Number(i.preco_unitario), subtotal: Number(i.subtotal) })),
  };
}
