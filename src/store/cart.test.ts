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
