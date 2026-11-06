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

export type FiltroKit = 'todos' | 'ate35' | 'tabaco' | 'completos';

export const FILTROS_KIT: { id: FiltroKit; rotulo: string }[] = [
  { id: 'todos', rotulo: 'Todos' },
  { id: 'ate35', rotulo: 'Até R$ 35' },
  { id: 'tabaco', rotulo: 'Com tabaco' },
  { id: 'completos', rotulo: 'Completos' },
];

/**
 * Filtros rápidos da página /kit. "Completos" são os kits com tesoura ou
 * dichavador; "Com tabaco" lê os itens do kit; "Até R$ 35" usa o preço do Pix,
 * que é o que o card mostra.
 */
export function kitNoFiltro(
  produto: { nome: string; subcategoria?: string | null; descricao?: string | null; preco: number; preco_pix?: number | null },
  filtro: FiltroKit
): boolean {
  if (filtro === 'todos') return true;
  if (filtro === 'ate35') return Number(produto.preco_pix ?? produto.preco) <= 35;
  const itens = itensDoKit(produto).join(' ').toLowerCase();
  if (filtro === 'tabaco') return itens.includes('tabaco');
  return /tesoura|dichavador|triturador/.test(itens);
}

/** "PAY-PAY KIT ALPHA" -> "Pay-Pay Kit Alpha". */
export function nomeDoKitEmTitulo(nome: string): string {
  return nome
    .trim()
    .toLowerCase()
    .replace(/(^|[\s-])(\p{L})/gu, (_m, sep: string, letra: string) => sep + letra.toUpperCase());
}

/**
 * Título e descrição de busca de um kit. Quem procura no Google digita
 * "kit seda piteira", "kit com isqueiro", "kit tabacaria": o título leva o
 * tipo do kit e a descrição lista o que vem dentro.
 *
 * Mantenha igual a `seoDoKit` em scripts/gerar-paginas.mjs, que gera o HTML
 * já pronto no build.
 */
export function seoDoKit(produto: {
  nome: string;
  subcategoria?: string | null;
  descricao?: string | null;
}): { titulo: string; descricao: string } {
  const itens = itensDoKit(produto);
  const texto = itens.join(' ').toLowerCase();
  const tipo = ehKitCase(produto)
    ? 'kit com case, tabaco e acessórios'
    : texto.includes('tabaco')
      ? 'kit com tabaco, seda e piteira'
      : /isqueiro|bic/.test(texto)
        ? 'kit de seda, piteira e isqueiro'
        : 'kit de seda e piteira';
  const lista =
    itens.length > 1 ? `${itens.slice(0, -1).join(', ')} e ${itens[itens.length - 1]}` : (itens[0] ?? '');
  return {
    titulo: `${nomeDoKitEmTitulo(produto.nome)} — ${tipo} | Alpha Galerie`,
    descricao: lista
      ? `Kit exclusivo Alpha Galerie: ${lista}. ${ehKitCase(produto) ? 'No case rígido Alpha' : 'Na embalagem exclusiva'}, só no site. Compre online e receba em casa.`
      : `${nomeDoKitEmTitulo(produto.nome)}: kit exclusivo Alpha Galerie, só no site. Compre online e receba em casa.`,
  };
}
