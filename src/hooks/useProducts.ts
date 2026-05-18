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
  search: string
): Promise<ProductsPage> {
  const from = page * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  // Optimized query: removed FK join (not used), using estimated count for speed
  let query = supabase
    .from('produtos')
    .select('id,nome,marca,preco,preco_pix,categoria_id,subcategoria,estoque,ativo,destaque,imagem_url,descricao,variacoes(id,produto_id,nome,preco,estoque,ordem,ativo,criado_em),categorias!produtos_categoria_id_fkey(*)', { count: 'estimated' })
    .eq('ativo', true)
    .order('destaque', { ascending: false })
    .order('id')
    .range(from, to);

  if (categoryId !== null) {
    query = query.eq('categoria_id', categoryId);
  }

  if (search.trim()) {
    // FULLTEXT search available after migration 20260508110000_fulltext_search_phase2.sql
    // Uncomment when migration is applied for 30x faster search:
    // query = query.textSearch('search_doc', search.trim(), { config: 'portuguese' });
    
    // Fallback to LIKE (slower but works without migration)
    query = query.or(`nome.ilike.%${search.trim()}%,marca.ilike.%${search.trim()}%`);
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
  search = ''
) {
  return useQuery<ProductsPage>({
    queryKey: ['produtos', categoryId, page, search],
    queryFn: () => fetchProducts(categoryId, page, search),
    staleTime: 5 * 60 * 1000,
    placeholderData: (prev) => prev,
  });
}
