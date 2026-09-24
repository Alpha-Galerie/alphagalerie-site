import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Produto, Variacao, ItemCarrinho } from '../types';
import { getPrecoInfo } from '../lib/preco';

function makeCartKey(prodId: number, variacaoId?: number): string {
  return variacaoId !== undefined ? `${prodId}::${variacaoId}` : `${prodId}`;
}

interface CartState {
  items: ItemCarrinho[];
  addItem(produto: Produto, variacao?: Variacao): void;
  removeItem(cartKey: string): void;
  changeQty(cartKey: string, delta: number): void;
  clear(): void;
  selectItemCount(): number;
  selectTotal(): number;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],

      addItem(produto, variacao) {
        const cartKey = makeCartKey(produto.id, variacao?.id);
        const estoqueDisponivel =
          variacao !== undefined ? variacao.estoque : (produto.estoque ?? 0);
        if (estoqueDisponivel !== null && estoqueDisponivel <= 0) return;

        set((state) => {
          const existing = state.items.find((i) => i.cartKey === cartKey);

          if (existing) {
            return {
              items: state.items.map((i) =>
                i.cartKey === cartKey
                  ? {
                      ...i,
                      qtd:
                        estoqueDisponivel !== null
                          ? Math.min(i.qtd + 1, estoqueDisponivel)
                          : i.qtd + 1,
                    }
                  : i
              ),
            };
          }

          const preco = getPrecoInfo(produto, variacao).precoFinal;
          const novoItem: ItemCarrinho = {
            id: produto.id,
            cartKey,
            variacaoId: variacao?.id,
            nome: produto.nome,
            variacao: variacao?.nome,
            marca: produto.marca,
            categoria: produto.categorias?.nome ?? '',
            subcategoria: produto.subcategoria,
            preco,
            imagem: produto.imagem_url,
            estoque: variacao !== undefined ? variacao.estoque : produto.estoque,
            qtd: 1,
          };

          return { items: [...state.items, novoItem] };
        });
      },

      removeItem(cartKey) {
        set((state) => ({
          items: state.items.filter((i) => i.cartKey !== cartKey),
        }));
      },

      changeQty(cartKey, delta) {
        set((state) => {
          const items = state.items.flatMap((i) => {
            if (i.cartKey !== cartKey) return [i];
            const newQty = i.qtd + delta;
            if (newQty < 1) return [];
            if (i.estoque !== null && newQty > i.estoque) return [i];
            return [{ ...i, qtd: newQty }];
          });
          return { items };
        });
      },

      clear() {
        set({ items: [] });
      },

      selectItemCount() {
        return get().items.reduce((acc, i) => acc + i.qtd, 0);
      },

      selectTotal() {
        return get().items.reduce((acc, i) => acc + i.preco * i.qtd, 0);
      },
    }),
    {
      name: 'alpha_cart',
    }
  )
);
