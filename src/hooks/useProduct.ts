import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import type { Produto, Variacao } from '../types';

async function fetchProduto(id: number): Promise<Produto> {
  const { data, error } = await supabase
    .from('produtos')
    .select('*, categorias!produtos_categoria_id_fkey(*), variacoes(id,produto_id,nome,preco,estoque,ordem,ativo,criado_em)')
    .eq('id', id)
    .single();

  if (error) throw error;

  const variacoes = ((data as { variacoes?: Variacao[] }).variacoes ?? [])
    .filter((variacao) => variacao.ativo)
    .slice()
    .sort((a, b) => a.ordem - b.ordem);

  return { ...data, _variacoes: variacoes } as Produto;
}

export function useProduct(produtoId: number | null) {
  return useQuery({
    queryKey: ['produto', produtoId],
    queryFn: () => fetchProduto(produtoId!),
    enabled: !!produtoId,
    staleTime: 5 * 60 * 1000,
  });
}
