import type { ItemCarrinho } from '../types';

/**
 * Nome do item como ele aparece no pedido: com a variação escolhida (sabor,
 * nicotina, ohm), para o retaguarda e o Mercado Pago saberem o que separar.
 */
export function nomeDoItem(item: Pick<ItemCarrinho, 'nome' | 'variacao'>): string {
  return item.variacao ? `${item.nome} — ${item.variacao}` : item.nome;
}
