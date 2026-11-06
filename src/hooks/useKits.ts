import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { KITS_SUBCATEGORIA } from '../lib/kits';
import type { Produto, Variacao } from '../types';

const COLS =
  'id,nome,marca,preco,preco_pix,preco_promocional,etiqueta,categoria_id,subcategoria,estoque,ativo,destaque,destaque_ordem,imagem_url,descricao,variacoes(id,produto_id,nome,preco,estoque,ordem,ativo,criado_em),categorias!produtos_categoria_id_fkey(*)';

async function fetchKits(): Promise<Produto[]> {
  const { data, error } = await supabase
    .from('produtos')
    .select(COLS)
    .eq('ativo', true)
    .eq('subcategoria', KITS_SUBCATEGORIA)
    .order('destaque_ordem', { ascending: true })
    .order('id', { ascending: true });

  if (error) throw new Error(error.message);

  const produtos = (data ?? []) as unknown as Array<
    Omit<Produto, '_variacoes'> & { variacoes?: Variacao[] }
  >;

  // Kits esgotados continuam na vitrine (com "Me avise quando voltar"), no
  // fim da lista, para medir a procura e não perder quem chegar depois.
  const disponiveis = produtos.filter((p) => (p.estoque ?? 0) > 0);
  const esgotados = produtos.filter((p) => (p.estoque ?? 0) <= 0);
  return [...disponiveis, ...esgotados].map((p) => ({
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
