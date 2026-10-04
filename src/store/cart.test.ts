import { describe, it, expect, beforeEach } from 'vitest';
import { useCartStore } from './cart';
import type { Produto } from '../types';

const mockProduto: Produto = {
  id: 1,
  nome: 'Produto Teste',
  marca: 'Marca',
  preco: 100,
  preco_pix: 95,
  preco_promocional: null,
  categoria_id: 1,
  subcategoria: null,
  estoque: 10,
  ativo: true,
  destaque: false,
  imagem_url: null,
  _variacoes: [],
};

beforeEach(() => {
  useCartStore.setState({ items: [] });
});

describe('changeQty', () => {
  it('removes the item when qty is decremented below 1', () => {
    useCartStore.getState().addItem(mockProduto);
    const cartKey = useCartStore.getState().items[0].cartKey;

    useCartStore.getState().changeQty(cartKey, -1);

    expect(useCartStore.getState().items).toHaveLength(0);
  });

  it('decrements qty normally when qty > 1', () => {
    useCartStore.getState().addItem(mockProduto);
    useCartStore.getState().addItem(mockProduto); // qty = 2
    const cartKey = useCartStore.getState().items[0].cartKey;

    useCartStore.getState().changeQty(cartKey, -1);

    expect(useCartStore.getState().items[0].qtd).toBe(1);
  });
});

function produto(parcial: Partial<Produto>): Produto {
  return {
    id: 1, nome: 'KIT DUO DE SEDAS', marca: 'ALPHA', preco: 55, preco_pix: 47, preco_promocional: 50,
    categoria_id: 1, subcategoria: 'Kits Exclusivos', estoque: 3, ativo: true, destaque: false,
    imagem_url: null, _variacoes: [], ...parcial,
  };
}

describe('carrinho guarda o preço de cada forma de pagamento', () => {
  it('cartão no preço de venda, Pix no preço Pix', () => {
    useCartStore.getState().addItem(produto({}));
    const [item] = useCartStore.getState().items;
    expect(item.preco).toBe(50);
    expect(item.precoPix).toBe(47);
    expect(useCartStore.getState().selectTotal()).toBe(50);
    expect(useCartStore.getState().selectTotalPix()).toBe(47);
  });

  it('produto com o mesmo preço no Pix não guarda preço Pix', () => {
    useCartStore.getState().addItem(produto({ preco_pix: 50 }));
    const [item] = useCartStore.getState().items;
    expect(item.preco).toBe(50);
    expect(item.precoPix).toBeUndefined();
    expect(useCartStore.getState().selectTotalPix()).toBe(50);
  });
});
