import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';

async function fetchSubcategories(categoryId: number | null): Promise<string[]> {
  if (categoryId === null) return [];

  const { data, error } = await supabase
    .from('produtos')
    .select('subcategoria')
    .eq('ativo', true)
    .eq('categoria_id', categoryId)
    .not('subcategoria', 'is', null);

  if (error) throw new Error(error.message);

  const unique = Array.from(
    new Set((data ?? []).map((r) => r.subcategoria as string))
  ).sort();

  return unique;
}

export function useSubcategories(categoryId: number | null) {
  return useQuery<string[]>({
    queryKey: ['subcategorias', categoryId],
    queryFn: () => fetchSubcategories(categoryId),
    staleTime: 10 * 60 * 1000,
    enabled: categoryId !== null,
  });
}
