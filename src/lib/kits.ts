/** Subcategoria que reúne os kits montados pela loja. */
export const KITS_SUBCATEGORIA = 'Kits Exclusivos';

/**
 * Foto de cenário (kit fotografado com fundo) preenche o card inteiro, sem a
 * moldura branca das fotos de produto recortado. Só os Kits Case Alpha têm
 * foto de cenário: os kits do Alpha Pocket são fotos de estúdio em fundo
 * branco e entram inteiros (sem corte) como qualquer produto.
 */
export function temFotoDeCenario(produto: { nome: string; subcategoria?: string | null }): boolean {
  return produto.subcategoria === KITS_SUBCATEGORIA && ehKitCase(produto);
}

/**
 * Linha Case Alpha: kits completos que vêm no case rígido. Os demais são os
 * kits do dia a dia, que vêm no Alpha Pocket (embalagem exclusiva).
 */
export function ehKitCase(produto: { nome: string }): boolean {
  return /\bCASE\b/i.test(produto.nome);
}
