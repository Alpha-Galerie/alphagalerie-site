import { useQuery } from '@tanstack/react-query';
import Fuse, { type IFuseOptions } from 'fuse.js';
import { useMemo } from 'react';
import { supabase } from '../lib/supabase';
import type { Categoria } from '../types';

export interface ProductIndex {
  id: number;
  nome: string;
  marca: string | null;
  categoria_id: number;
  subcategoria: string | null;
  _categoria_nome?: string;
}

async function fetchProductsIndex(): Promise<ProductIndex[]> {
  const { data, error } = await supabase
    .from('produtos')
    .select('id,nome,marca,categoria_id,subcategoria')
    .eq('ativo', true)
    .limit(1000);

  if (error) throw new Error(error.message);
  return data ?? [];
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
    { name: '_categoria_nome', weight: 1 },
    { name: 'subcategoria', weight: 1 },
  ],
  threshold: 0.35,
  ignoreLocation: true,
  minMatchCharLength: 2,
  includeScore: false,
};

// Accepts categorias from useCategories (already cached) to avoid a join in the DB query
export function useProductsFuse(categoryId: number | null, categorias: Categoria[]) {
  const { data: index = [] } = useProductsIndex();

  const scopedIndex = useMemo(() => {
    const catMap = new Map(categorias.map((c) => [c.id, c.nome]));
    const scoped = categoryId === null
      ? index
      : index.filter((p) => p.categoria_id === categoryId);
    return scoped.map((p) => ({ ...p, _categoria_nome: catMap.get(p.categoria_id) }));
  }, [index, categoryId, categorias]);

  return useMemo(() => new Fuse(scopedIndex, FUSE_OPTIONS), [scopedIndex]);
}
