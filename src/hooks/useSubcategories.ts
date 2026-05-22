import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';

async function fetchSubcategories(categoryId: number | null): Promise<string[]> {
  let query = supabase
    .from('produtos')
    .select('subcategoria')
    .eq('ativo', true)
    .not('subcategoria', 'is', null);

  if (categoryId !== null) {
    query = query.eq('categoria_id', categoryId);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);

  return Array.from(
    new Set((data ?? []).map((r) => r.subcategoria as string))
  ).sort((a, b) => a.localeCompare(b, 'pt-BR'));
}

export function useSubcategories(categoryId: number | null) {
  return useQuery<string[]>({
    queryKey: ['subcategorias', categoryId],
    queryFn: () => fetchSubcategories(categoryId),
    staleTime: 10 * 60 * 1000,
  });
}
