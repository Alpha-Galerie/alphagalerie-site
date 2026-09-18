import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';

export interface Marca {
  nome: string;
  total: number;
  comEstoque: number;
}

interface LinhaRpc {
  marca: string;
  total: number | string;
  com_estoque: number | string;
}

/**
 * Marcas presentes no recorte que o cliente está vendo — não no catálogo
 * inteiro.
 *
 * A distinção importa: a loja tem 132 marcas só em Headshop, número que não
 * cabe em tela nenhuma. Dentro de uma subcategoria o normal são 2 a 8, o que
 * cabe numa fileira de botões. Em Essências, por exemplo, são 7: ADALYA (20),
 * ZIGGY (19), NAY (13) e mais quatro.
 *
 * Vem ordenado do banco pelo que tem estoque, igual aos produtos e às
 * subcategorias.
 */
async function fetchMarcas(
  categoryId: number | null,
  subcategoria: string | null
): Promise<Marca[]> {
  // Em "Todos" não há fileira de marca, pela mesma razão que não há de
  // subcategoria: seriam centenas de botões antes do primeiro produto.
  if (categoryId === null) return [];

  const { data, error } = await supabase.rpc('marcas_da_loja', {
    p_categoria_id: categoryId,
    p_subcategoria: subcategoria,
  });
  if (error) throw new Error(error.message);

  return ((data ?? []) as LinhaRpc[]).map((r) => ({
    nome: r.marca,
    total: Number(r.total),
    comEstoque: Number(r.com_estoque),
  }));
}

export function useMarcas(categoryId: number | null, subcategoria: string | null) {
  return useQuery<Marca[]>({
    queryKey: ['marcas', categoryId, subcategoria],
    queryFn: () => fetchMarcas(categoryId, subcategoria),
    staleTime: 10 * 60 * 1000,
  });
}
