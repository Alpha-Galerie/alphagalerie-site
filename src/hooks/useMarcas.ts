import { useMemo } from 'react';
import { useProductsIndex } from './useProductsIndex';

const MAX_MARCAS = 18;

/**
 * Marcas do catálogo, ordenadas pela quantidade de produtos ativos.
 * Reaproveita o índice de produtos já cacheado pela busca — sem query extra.
 */
export function useMarcas(limite = MAX_MARCAS) {
  const { data: index = [], isLoading } = useProductsIndex();

  const marcas = useMemo(() => {
    const porMarca = new Map<string, { nome: string; total: number }>();

    for (const produto of index) {
      const nome = produto.marca?.trim();
      if (!nome) continue;
      const chave = nome.toLowerCase();
      const atual = porMarca.get(chave);
      if (atual) atual.total += 1;
      else porMarca.set(chave, { nome, total: 1 });
    }

    return [...porMarca.values()]
      .sort((a, b) => b.total - a.total || a.nome.localeCompare(b.nome, 'pt-BR'))
      .slice(0, limite)
      .map((m) => m.nome);
  }, [index, limite]);

  return { marcas, isLoading };
}
