import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { ETIQUETA_RELAMPAGO } from '../lib/campanha';
import type { Produto } from '../types';

const COLS =
  'id,nome,marca,preco,preco_pix,preco_pix_leve2,preco_promocional,etiqueta,categoria_id,subcategoria,estoque,ativo,destaque,destaque_ordem,imagem_url,descricao,categorias!produtos_categoria_id_fkey(*)';

/**
 * Peças da vitrine relâmpago: etiqueta "Esgotando" na retaguarda e com
 * estoque. Ao zerar, a peça sai da vitrine sozinha.
 */
async function fetchOfertas(): Promise<Produto[]> {
  const { data, error } = await supabase
    .from('produtos')
    .select(COLS)
    .eq('ativo', true)
    .eq('etiqueta', ETIQUETA_RELAMPAGO)
    .gt('estoque', 0)
    .order('estoque', { ascending: true })
    .order('preco_pix', { ascending: true })
    .limit(8);
  if (error) throw new Error(error.message);
  return ((data ?? []) as unknown as Produto[]).map((p) => ({ ...p, _variacoes: [] }));
}

export function useOfertasRelampago(ativo: boolean) {
  return useQuery<Produto[]>({
    queryKey: ['ofertas-relampago'],
    queryFn: fetchOfertas,
    enabled: ativo,
    staleTime: 60 * 1000,
  });
}
