import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';

async function fetchSubcategoriasOcultas(): Promise<string[]> {
  const { data, error } = await supabase
    .from('configuracoes')
    .select('valor')
    .eq('chave', 'subcategorias_ocultas')
    .single();

  if (error || !data) return [];
  return (data.valor as string[]) ?? [];
}

export function useSubcategoriasOcultas() {
  return useQuery<string[]>({
    queryKey: ['subcategorias_ocultas'],
    queryFn: fetchSubcategoriasOcultas,
    staleTime: 30 * 60 * 1000,
  });
}
