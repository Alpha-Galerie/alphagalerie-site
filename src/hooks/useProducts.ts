import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import type { Produto, Variacao } from '../types';

const PAGE_SIZE = 24;

export interface ProductsPage {
  produtos: Produto[];
  total: number;
  page: number;
}

async function fetchProducts(
  categoryId: number | null,
  page: number,
  search: string,
  subcategoria: string | null,
  extraCategoryIds: number[]
): Promise<ProductsPage> {
  const from = page * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  let query = supabase
    .from('produtos')
    .select('id,nome,marca,preco,preco_pix,categoria_id,subcategoria,estoque,ativo,destaque,imagem_url,descricao,variacoes(id,produto_id,nome,preco,estoque,ordem,ativo,criado_em),categorias!produtos_categoria_id_fkey(*)', { count: 'estimated' })
    .eq('ativo', true)
    .order('destaque', { ascending: false })
    .order('id')
    .range(from, to);

  // If a specific category is selected, filter by it (ignores extraCategoryIds)
  if (categoryId !== null) {
    query = query.eq('categoria_id', categoryId);
  } else if (extraCategoryIds.length > 0) {
    // Search text matched category names — include products from those categories
    query = query.in('categoria_id', extraCategoryIds);
  }

  if (subcategoria) {
    query = query.ilike('subcategoria', subcategoria);
  }

  if (search.trim()) {
    // FULLTEXT search available after migration 20260508110000_fulltext_search_phase2.sql
    // Uncomment when migration is applied for 30x faster search:
    // query = query.textSearch('search_doc', search.trim(), { config: 'portuguese' });

    // LIKE fallback — name, brand and subcategory. Category is handled via extraCategoryIds.
    if (extraCategoryIds.length === 0) {
      query = query.or(`nome.ilike.%${search.trim()}%,marca.ilike.%${search.trim()}%,subcategoria.ilike.%${search.trim()}%`);
    }
  }

  const { data: produtosRaw, error: produtosError, count } = await query;

  if (produtosError) throw new Error(produtosError.message);

  const produtos = (produtosRaw ?? []) as unknown as Array<
    Omit<Produto, '_variacoes'> & { variacoes?: Variacao[] }
  >;

  const produtosComVariacoes = produtos.map((p) => ({
    ...p,
    _variacoes: (p.variacoes ?? [])
      .filter((variacao) => variacao.ativo)
      .slice()
      .sort((a, b) => a.ordem - b.ordem),
  })) as Produto[];

  return { produtos: produtosComVariacoes, total: count ?? 0, page };
}

export function useProducts(
  categoryId: number | null,
  page = 0,
  search = '',
  subcategoria: string | null = null,
  extraCategoryIds: number[] = []
) {
  return useQuery<ProductsPage>({
    queryKey: ['produtos', categoryId, page, search, subcategoria, extraCategoryIds],
    queryFn: () => fetchProducts(categoryId, page, search, subcategoria, extraCategoryIds),
    staleTime: 5 * 60 * 1000,
    placeholderData: (prev) => prev,
  });
}
