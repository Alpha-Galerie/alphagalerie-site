import { supabase } from '../lib/supabase';
import { marcarQueJaComprou } from './useOfertaSaida';
import type { Pedido, ItemCarrinho } from '../types';

interface SubmitResult {
  success: boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  pedido?: any;
  error?: string;
}

function buildEnderecoTexto(dados: Pedido): string | null {
  const parts = [
    dados.endereco,
    dados.bairro,
    dados.cidade,
    dados.estado,
    dados.cep,
    dados.complemento,
  ].filter(Boolean);
  return parts.length > 0 ? parts.join(', ') : null;
}

// Fallback method (old approach, before migration)
async function fallbackInsertPedido(
  dados: Pedido,
  linhas: Array<Record<string, unknown>>,
  numero: string,
  subtotal: number,
  total: number
): Promise<SubmitResult> {
  try {
    const payload = {
      numero,
      cliente_nome: dados.nome,
      cliente_whatsapp: dados.telefone,
      cliente_email: dados.email ?? null,
      cliente_endereco: buildEnderecoTexto(dados),
      forma_pagamento: dados.pagamento,
      tipo_entrega: dados.entrega,
      observacoes: dados.observacoes ?? null,
      subtotal,
      total,
      status: 'pendente' as const,
    };

    const { data, error } = await supabase
      .from('pedidos')
      .insert(payload)
      .select()
      .single();

    if (error) throw error;

    // Insert line items (best-effort, non-blocking)
    if (data?.id && linhas.length > 0) {
      const itemsWithPedidoId = linhas.map((linha) => ({
        ...linha,
        pedido_id: data.id,
      }));
      await supabase.from('pedido_itens').insert(itemsWithPedidoId);
    }

    marcarQueJaComprou();
    return { success: true, pedido: data };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erro ao registrar pedido.';
    console.error('[useCheckout] fallbackInsertPedido error:', err);
    return { success: false, error: message };
  }
}

export function useCheckout() {
  async function submitPedido(
    dados: Pedido,
    itens: ItemCarrinho[]
  ): Promise<SubmitResult> {
    try {
      const subtotal = itens.reduce((acc, i) => acc + i.preco * i.qtd, 0);
      const numero = `AG${Date.now()}`;

      // Prepare items array for RPC call (migration 20260508120000 required)
      const linhas = itens.map((item) => ({
        produto_id: item.id,
        produto_nome: item.nome,
        produto_codigo: item.codigo ?? null,
        quantidade: item.qtd,
        preco_unitario: item.preco,
        subtotal: item.preco * item.qtd,
        variacao_id: item.variacaoId ?? null,
      }));

      // Use RPC function for atomic transaction (optimized & safer)
      // Fallback to individual inserts if RPC not available (before migration)
      try {
        const { data, error } = await supabase.rpc('create_order_with_items', {
          p_numero: numero,
          p_cliente_nome: dados.nome,
          p_cliente_whatsapp: dados.telefone,
          p_cliente_email: dados.email ?? null,
          p_cliente_endereco: buildEnderecoTexto(dados),
          p_forma_pagamento: dados.pagamento,
          p_tipo_entrega: dados.entrega,
          p_observacoes: dados.observacoes ?? null,
          p_subtotal: subtotal,
          p_total: dados.total,
          p_itens: linhas,
        });

        if (error) throw error;
        marcarQueJaComprou();
        return { success: true, pedido: data };
      } catch (rpcError: unknown) {
        // Fallback to old method if RPC not available
        console.warn('[useCheckout] RPC not available, using fallback:', rpcError);
        return fallbackInsertPedido(dados, linhas, numero, subtotal, dados.total);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erro ao registrar pedido.';
      console.error('[useCheckout] submitPedido error:', err);
      return { success: false, error: message };
    }
  }

  return { submitPedido };
}
