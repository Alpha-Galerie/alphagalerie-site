import { useQuery } from '@tanstack/react-query';
import Fuse, { type IFuseOptions } from 'fuse.js';
import { useMemo } from 'react';
import { supabase } from '../lib/supabase';

export interface ProductIndex {
  id: number;
  nome: string;
  marca: string | null;
  preco: number;
  preco_pix: number | null;
  categoria_id: number;
  subcategoria: string | null;
  estoque: number | null;
  imagem_url: string | null;
  categorias: { id: number; nome: string; slug: string; ordem: number; ativo: boolean } | null;
  _variacoes: [];
}

async function fetchProductsIndex(): Promise<ProductIndex[]> {
  const { data, error } = await supabase
    .from('produtos')
    .select('id,nome,marca,preco,preco_pix,categoria_id,subcategoria,estoque,imagem_url,categorias!produtos_categoria_id_fkey(id,nome,slug,ordem,ativo)')
    .eq('ativo', true)
    .order('destaque', { ascending: false })
    .order('id')
    .limit(500);

  if (error) throw new Error(error.message);
  return ((data ?? []) as unknown as ProductIndex[]).map((p) => ({ ...p, _variacoes: [] }));
}

export function useProductsIndex() {
  return useQuery<ProductIndex[]>({
    queryKey: ['produtos-index'],
    queryFn: fetchProductsIndex,
    staleTime: Infinity,
    gcTime: Infinity,
  });
}

const FUSE_OPTIONS: IFuseOptions<ProductIndex> = {
  keys: [
    { name: 'nome', weight: 2 },
    { name: 'marca', weight: 1.5 },
    { name: 'categorias.nome', weight: 1 },
    { name: 'subcategoria', weight: 1 },
  ],
  threshold: 0.35,
  ignoreLocation: true,
  minMatchCharLength: 2,
  includeScore: false,
};

export function useProductsFuse(categoryId: number | null) {
  const { data: index = [] } = useProductsIndex();

  const scopedIndex = useMemo(
    () => categoryId === null ? index : index.filter((p) => p.categoria_id === categoryId),
    [index, categoryId]
  );

  return useMemo(() => new Fuse(scopedIndex, FUSE_OPTIONS), [scopedIndex]);
}
