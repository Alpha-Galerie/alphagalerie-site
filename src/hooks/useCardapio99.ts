import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { CATEGORIAS_CARDAPIO, montarCardapio } from '../lib/cardapio99';
import type { SecaoCardapio } from '../lib/cardapio99';
import type { Produto } from '../types';

const COLUNAS =
  'id,nome,marca,preco,preco_pix,preco_promocional,categoria_id,subcategoria,estoque,imagem_url,descricao';

async function fetchCardapio(): Promise<SecaoCardapio[]> {
  const { data, error } = await supabase
    .from('produtos')
    .select(COLUNAS)
    .eq('ativo', true)
    .in('categoria_id', CATEGORIAS_CARDAPIO)
    // O PostgREST corta em 1000 por padrão; deixando explícito para o dia em
    // que o catálogo dessas categorias passar disso e o cardápio começar a
    // perder item sozinho, sem erro nenhum.
    .limit(1000);

  if (error) throw new Error(error.message);

  return montarCardapio((data ?? []) as unknown as Produto[]);
}

export function useCardapio99() {
  return useQuery<SecaoCardapio[]>({
    queryKey: ['cardapio-99'],
    queryFn: fetchCardapio,
    staleTime: 10 * 60 * 1000,
  });
}
