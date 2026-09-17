import { useCartStore } from '../store/cart';
import { useToastStore } from '../store/toast';
import { getPrecoInfo } from '../lib/preco';
import type { Produto, Variacao } from '../types';

/**
 * Adiciona ao carrinho e dispara o toast. Compartilhado pela vitrine de
 * destaques e pelo grid de produtos para a regra de preço ficar num lugar só.
 */
export function useCarrinhoActions() {
  const addItem = useCartStore((s) => s.addItem);
  const showToast = useToastStore((s) => s.showToast);

  function adicionar(produto: Produto) {
    addItem(produto);
    showToast({
      id: produto.id,
      cartKey: String(produto.id),
      nome: produto.nome,
      marca: produto.marca,
      categoria: produto.categorias?.nome ?? '',
      preco: getPrecoInfo(produto).precoFinal,
      imagem: produto.imagem_url,
      estoque: produto.estoque,
      qtd: 1,
    });
  }

  function adicionarVariacao(produto: Produto, variacao: Variacao) {
    addItem(produto, variacao);
    showToast({
      id: produto.id,
      cartKey: `${produto.id}::${variacao.id}`,
      variacaoId: variacao.id,
      nome: produto.nome,
      variacao: variacao.nome,
      marca: produto.marca,
      categoria: produto.categorias?.nome ?? '',
      preco: getPrecoInfo(produto, variacao).precoFinal,
      imagem: produto.imagem_url,
      estoque: variacao.estoque,
      qtd: 1,
    });
  }

  return { adicionar, adicionarVariacao };
}
