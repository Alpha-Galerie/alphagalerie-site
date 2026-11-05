/** Subcategoria que reúne os kits montados pela loja. */
export const KITS_SUBCATEGORIA = 'Kits Exclusivos';

/**
 * Foto de cenário (kit fotografado com fundo) preenche o card inteiro, sem a
 * moldura branca das fotos de produto recortado.
 */
export function temFotoDeCenario(produto: { subcategoria?: string | null }): boolean {
  return produto.subcategoria === KITS_SUBCATEGORIA;
}

/**
 * Linha Case Alpha: kits completos que vêm no case rígido. Os demais são os
 * kits do dia a dia, que vêm no Alpha Pocket (embalagem exclusiva).
 */
export function ehKitCase(produto: { nome: string }): boolean {
  return /\bCASE\b/i.test(produto.nome);
}
