import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import type { Produto, Variacao } from '../types';

/** Subcategoria que reúne os kits montados pela loja. */
export const KITS_SUBCATEGORIA = 'Kits Exclusivos';

const COLS =
  'id,nome,marca,preco,preco_pix,preco_promocional,categoria_id,subcategoria,estoque,ativo,destaque,destaque_ordem,imagem_url,descricao,variacoes(id,produto_id,nome,preco,estoque,ordem,ativo,criado_em),categorias!produtos_categoria_id_fkey(*)';

async function fetchKits(): Promise<Produto[]> {
  const { data, error } = await supabase
    .from('produtos')
    .select(COLS)
    .eq('ativo', true)
    .eq('subcategoria', KITS_SUBCATEGORIA)
    .gt('estoque', 0)
    .order('destaque_ordem', { ascending: true })
    .order('id', { ascending: true });

  if (error) throw new Error(error.message);

  const produtos = (data ?? []) as unknown as Array<
    Omit<Produto, '_variacoes'> & { variacoes?: Variacao[] }
  >;

  return produtos.map((p) => ({
    ...p,
    _variacoes: (p.variacoes ?? [])
      .filter((v) => v.ativo)
      .slice()
      .sort((a, b) => a.ordem - b.ordem),
  })) as Produto[];
}

export function useKits() {
  return useQuery<Produto[]>({
    queryKey: ['produtos-kits'],
    queryFn: fetchKits,
    staleTime: 5 * 60 * 1000,
  });
}
