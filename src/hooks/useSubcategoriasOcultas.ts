import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';

async function fetchSubcategoriasOcultas(): Promise<string[]> {
  const { data, error } = await supabase
    .from('configuracoes')
    .select('valor')
    .eq('chave', 'subcategorias_ocultas')
    .single();

  if (error || !data) return [];

  const valor = data.valor;
  if (Array.isArray(valor)) {
    return valor.map((v: string) => v.toLowerCase());
  }
  return [];
}

export function useSubcategoriasOcultas() {
  return useQuery<string[]>({
    queryKey: ['config', 'subcategorias_ocultas'],
    queryFn: fetchSubcategoriasOcultas,
    staleTime: 30 * 60 * 1000, // 30 minutos
  });
}
