import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { getPrecoInfo } from '../lib/preco';
import type { Produto, Variacao } from '../types';

const COLS =
  'id,nome,marca,preco,preco_pix,preco_promocional,categoria_id,subcategoria,estoque,ativo,destaque,destaque_ordem,imagem_url,descricao,variacoes(id,produto_id,nome,preco,estoque,ordem,ativo,criado_em),categorias!produtos_categoria_id_fkey(*)';

export const DESTAQUES_LIMIT = 8;

async function fetchDestaques(): Promise<Produto[]> {
  const { data, error } = await supabase
    .from('produtos')
    .select(COLS)
    .eq('ativo', true)
    .eq('destaque', true)
    .order('destaque_ordem', { ascending: true })
    .order('id', { ascending: false })
    .limit(40);

  if (error) throw new Error(error.message);

  const produtos = (data ?? []) as unknown as Array<
    Omit<Produto, '_variacoes'> & { variacoes?: Variacao[] }
  >;

  return produtos
    .map((p) => ({
      ...p,
      _variacoes: (p.variacoes ?? [])
        .filter((v) => v.ativo)
        .slice()
        .sort((a, b) => a.ordem - b.ordem),
    }))
    .filter((p) => {
      // Produto sem estoque não ajuda a desencalhar nada — só entra se tiver
      // variação disponível.
      const temVariacaoComEstoque = p._variacoes.some((v) => v.estoque > 0);
      return p.estoque === null || p.estoque > 0 || temVariacaoComEstoque;
    })
    .sort((a, b) => {
      // Promoções primeiro, com o maior desconto na frente.
      const descontoA = getPrecoInfo(a).desconto;
      const descontoB = getPrecoInfo(b).desconto;
      if (descontoA !== descontoB) return descontoB - descontoA;
      return (a.destaque_ordem ?? 0) - (b.destaque_ordem ?? 0);
    })
    .slice(0, DESTAQUES_LIMIT) as Produto[];
}

export function useDestaques() {
  return useQuery<Produto[]>({
    queryKey: ['produtos-destaques'],
    queryFn: fetchDestaques,
    staleTime: 5 * 60 * 1000,
  });
}
