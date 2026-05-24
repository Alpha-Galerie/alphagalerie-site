import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import type { Categoria } from '../types';

async function fetchCategorias(): Promise<Categoria[]> {
  const { data, error } = await supabase
    .from('categorias')
    .select('*')
    .eq('ativo', true)
    .eq('oculto', false)
    .order('ordem');

  if (error) throw new Error(error.message);
  return (data ?? []) as Categoria[];
}

export function useCategories() {
  return useQuery<Categoria[]>({
    queryKey: ['categorias'],
    queryFn: fetchCategorias,
    staleTime: 10 * 60 * 1000,
  });
}
