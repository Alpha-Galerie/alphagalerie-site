/** Subcategoria que reúne os kits montados pela loja. */
export const KITS_SUBCATEGORIA = 'Kits Exclusivos';

/**
 * Foto de cenário (kit fotografado com fundo) preenche o card inteiro, sem a
 * moldura branca das fotos de produto recortado. Só os Kits Case Alpha têm
 * foto de cenário: os kits do dia a dia são fotos de estúdio em fundo
 * branco e entram inteiros (sem corte) como qualquer produto.
 */
export function temFotoDeCenario(produto: { nome: string; subcategoria?: string | null }): boolean {
  return produto.subcategoria === KITS_SUBCATEGORIA && ehKitCase(produto);
}

/**
 * Linha Case Alpha: kits completos que vêm no case rígido. Os demais são os
 * kits do dia a dia, que vêm na embalagem exclusiva Alpha Galerie.
 */
export function ehKitCase(produto: { nome: string }): boolean {
  return /\bCASE\b/i.test(produto.nome);
}

/**
 * Itens de um kit, um por linha, para o card mostrar logo abaixo da foto o
 * que vem dentro. Lê a descrição do produto em um dos dois formatos usados:
 *   - linhas começando com "•" (kits novos);
 *   - "Vem no kit: item + item + item." (Kits Case Alpha).
 * Retorna [] quando não é kit ou a descrição não traz a lista.
 */
export function itensDoKit(produto: { subcategoria?: string | null; descricao?: string | null }): string[] {
  if (produto.subcategoria !== KITS_SUBCATEGORIA || !produto.descricao) return [];
  const linhas = produto.descricao
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.startsWith('•'))
    .map((l) => l.replace(/^•\s*/, ''))
    .filter(Boolean);
  if (linhas.length > 0) return linhas;
  const vem = produto.descricao.match(/Vem no kit:\s*(.+?)\.(\s|$)/);
  if (!vem) return [];
  return vem[1]
    .split(' + ')
    .map((i) => i.trim())
    .filter(Boolean)
    .map((i) => i.charAt(0).toUpperCase() + i.slice(1));
}
