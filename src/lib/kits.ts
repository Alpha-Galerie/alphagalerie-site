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
 * Linha "Kit Zip": kits do dia a dia que vão no zip Alpha (o mesmo que o
 * cliente reaproveita depois). Os demais kits são da linha Case Alpha.
 */
export function ehKitZip(produto: { nome: string }): boolean {
  return /^KIT ZIP\b/i.test(produto.nome.trim());
}
