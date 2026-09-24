import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import {
  escolherSugestoes,
  subcategoriasDosTipos,
  tiposParaOferecer,
} from '../lib/sugestoes';
import type { Produto, Variacao } from '../types';

const COLS =
  'id,nome,marca,preco,preco_pix,preco_promocional,categoria_id,subcategoria,estoque,ativo,destaque,destaque_ordem,imagem_url,variacoes(id,produto_id,nome,preco,estoque,ordem,ativo),categorias!produtos_categoria_id_fkey(*)';

async function fetchCandidatos(subcategorias: string[]): Promise<Produto[]> {
  // Subcategorias vêm normalizadas (sem acento, minúsculas); o ilike sem
  // curinga casa com "Seda", "SEDA" etc. Aspas por causa dos espaços
  // ("piteira de vidro").
  const filtro = subcategorias.map((s) => `subcategoria.ilike."${s}"`).join(',');
  const { data, error } = await supabase
    .from('produtos')
    .select(COLS)
    .eq('ativo', true)
    .or(filtro)
    .limit(200);

  if (error) throw new Error(error.message);

  return ((data ?? []) as unknown as Array<Omit<Produto, '_variacoes'> & { variacoes?: Variacao[] }>)
    .map((p) => ({ ...p, _variacoes: (p.variacoes ?? []).filter((v) => v.ativo) })) as Produto[];
}

/**
 * Produtos que combinam com o que o cliente escolheu (carrinho ou produto
 * aberto). Devolve lista vazia enquanto carrega ou se nada combinar.
 */
export function useSugestoes(
  itens: Array<{ id: number; nome: string; subcategoria?: string | null }>
): Produto[] {
  const tipos = useMemo(() => tiposParaOferecer(itens), [itens]);
  const subcategorias = useMemo(() => subcategoriasDosTipos(tipos), [tipos]);

  const { data: candidatos = [] } = useQuery<Produto[]>({
    queryKey: ['sugestoes', subcategorias.join('|')],
    queryFn: () => fetchCandidatos(subcategorias),
    enabled: subcategorias.length > 0,
    staleTime: 5 * 60 * 1000,
  });

  return useMemo(
    () => escolherSugestoes(candidatos, tipos, itens.map((i) => i.id)),
    [candidatos, tipos, itens]
  );
}
