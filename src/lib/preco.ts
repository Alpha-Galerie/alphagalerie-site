import type { Produto, Variacao } from '../types';

export interface PrecoInfo {
  /** Preço cheio, exibido riscado. `null` quando não há promoção. */
  precoDe: number | null;
  /** Preço de venda atual (o promocional, quando houver). */
  precoVenda: number;
  /** Preço à vista no Pix, quando for menor que o preço de venda. */
  precoPix: number | null;
  /** Preço que vai para o carrinho (Pix quando existir). */
  precoFinal: number;
  /** Desconto em % do preço cheio para o preço de venda (0 sem promoção). */
  desconto: number;
  emPromocao: boolean;
}

function valido(valor: number | null | undefined): valor is number {
  return typeof valor === 'number' && Number.isFinite(valor) && valor > 0;
}

/**
 * Centraliza a regra de preço do produto:
 *   preco             → preço cheio ("de")
 *   preco_promocional → preço promocional ("por"), quando menor que o cheio
 *   preco_pix         → preço à vista, quando menor que o preço de venda
 *
 * Quando a variação tem preço próprio, ela manda: é o preço final, sem
 * promoção nem Pix (mesma regra que o carrinho já usava).
 */
export function getPrecoInfo(
  produto: Pick<Produto, 'preco' | 'preco_pix' | 'preco_promocional'>,
  variacao?: Pick<Variacao, 'preco'> | null
): PrecoInfo {
  if (variacao && valido(variacao.preco)) {
    return {
      precoDe: null,
      precoVenda: variacao.preco,
      precoPix: null,
      precoFinal: variacao.preco,
      desconto: 0,
      emPromocao: false,
    };
  }

  const precoCheio = produto.preco;
  const promo = produto.preco_promocional;
  const emPromocao = valido(promo) && valido(precoCheio) && promo < precoCheio;
  const precoVenda = emPromocao ? (promo as number) : precoCheio;

  const pix = produto.preco_pix;
  const precoPix = valido(pix) && pix < precoVenda ? pix : null;

  return {
    precoDe: emPromocao ? precoCheio : null,
    precoVenda,
    precoPix,
    precoFinal: precoPix ?? precoVenda,
    desconto: emPromocao ? Math.round(((precoCheio - precoVenda) / precoCheio) * 100) : 0,
    emPromocao,
  };
}
