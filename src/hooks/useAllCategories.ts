import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import type { Categoria } from '../types';

async function fetchAllCategorias(): Promise<Categoria[]> {
  const { data, error } = await supabase
    .from('categorias')
    .select('*')
    .eq('ativo', true)
    .order('ordem');

  if (error) throw new Error(error.message);
  return (data ?? []) as Categoria[];
}

export function useAllCategories() {
  return useQuery<Categoria[]>({
    queryKey: ['all-categorias'],
    queryFn: fetchAllCategorias,
    staleTime: 10 * 60 * 1000,
  });
}
