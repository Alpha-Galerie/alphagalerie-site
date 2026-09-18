import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';

export interface Subcategoria {
  nome: string;
  total: number;
  comEstoque: number;
}

interface LinhaRpc {
  subcategoria: string;
  total: number | string;
  com_estoque: number | string;
}

/**
 * Subcategorias de uma categoria, já na ordem em que interessam a quem
 * está comprando: mais itens disponíveis primeiro, esgotadas por último.
 *
 * Duas mudanças em relação à versão anterior:
 *
 * 1. Em "Todos" não devolve nada. A loja tem 68 subcategorias somando
 *    todas as categorias, e mostrar as 68 de uma vez é pior do que não
 *    mostrar nenhuma — era exatamente a confusão que o cliente enfrentava
 *    ao abrir o site.
 *
 * 2. A contagem vem agregada do banco. Antes trazia uma linha por produto
 *    para juntar aqui; hoje são 574 linhas e o PostgREST corta a resposta
 *    em 1000, então a barra ia começar a perder subcategorias sozinha,
 *    sem erro nenhum, conforme o catálogo crescesse.
 */
async function fetchSubcategories(
  categoryId: number | null,
  ocultas: string[]
): Promise<Subcategoria[]> {
  if (categoryId === null) return [];

  const { data, error } = await supabase.rpc('subcategorias_da_loja', {
    p_categoria_id: categoryId,
  });
  if (error) throw new Error(error.message);

  return ((data ?? []) as LinhaRpc[])
    .filter((r) => !ocultas.includes(String(r.subcategoria).toLowerCase()))
    .map((r) => ({
      nome: r.subcategoria,
      total: Number(r.total),
      comEstoque: Number(r.com_estoque),
    }));
}

export function useSubcategories(
  categoryId: number | null,
  ocultas: string[] = []
) {
  return useQuery<Subcategoria[]>({
    queryKey: ['subcategorias', categoryId, ocultas],
    queryFn: () => fetchSubcategories(categoryId, ocultas),
    staleTime: 10 * 60 * 1000,
  });
}
