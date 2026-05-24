import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';

async function fetchSubcategories(
  categoryId: number | null,
  ocultas: string[]
): Promise<string[]> {
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
  )
    .filter((s) => !ocultas.includes(s.toLowerCase()))
    .sort((a, b) => a.localeCompare(b, 'pt-BR'));
}

export function useSubcategories(
  categoryId: number | null,
  ocultas: string[] = []
) {
  return useQuery<string[]>({
    queryKey: ['subcategorias', categoryId, ocultas],
    queryFn: () => fetchSubcategories(categoryId, ocultas),
    staleTime: 10 * 60 * 1000,
  });
}
