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

// Tipos de item que as pessoas buscam, na ordem em que entram no título.
// Tabaco e acessórios de pouca busca ficam só na descrição.
const PRIORIDADE_NO_TITULO: Record<string, number> = {
  case: 0,
  seda: 1,
  sedas: 1,
  piteira: 2,
  piteiras: 2,
  dichavador: 3,
  triturador: 3,
  tesoura: 4,
  isqueiro: 5,
};

/**
 * Nome curto de um item do kit para o título de busca:
 * "1 seda Alpha Hemp Brasil Slim Brown" -> "Seda Alpha Hemp",
 * "2 sedas Pay-Pay Go Green Slim" -> "2 Sedas Pay-Pay". Tabaco e itens fora
 * da lista de prioridade devolvem null.
 */
export function nomeCurtoDoItem(item: string): { rotulo: string; prioridade: number } | null {
  const m = item.trim().match(/^(\d+)\s+(.+)$/);
  const qtd = m ? Number(m[1]) : 1;
  const palavras = (m ? m[2] : item.trim()).split(/\s+/);
  const tipo = palavras[0]?.toLowerCase() ?? '';
  const prioridade = PRIORIDADE_NO_TITULO[tipo];
  if (prioridade === undefined) return null;
  if (tipo === 'case') return { rotulo: palavras.join(' '), prioridade };
  let marca = palavras[1] ?? '';
  if (palavras[2] === 'Hemp') marca += ' Hemp';
  const rotuloTipo = palavras[0].charAt(0).toUpperCase() + palavras[0].slice(1);
  return { rotulo: `${qtd > 1 ? `${qtd} ` : ''}${rotuloTipo}${marca ? ` ${marca}` : ''}`, prioridade };
}

/**
 * Título e descrição de busca de um kit. O título começa pelo que as pessoas
 * digitam no Google (seda, piteira, dichavador, tesoura, isqueiro, com a
 * marca): quem procura "seda Alpha Hemp" ou "piteira Papelito" cai no kit.
 * O tabaco fica só na descrição.
 *
 * Mantenha igual a `seoDoKit` em scripts/lib/paginas.mjs, que gera o HTML
 * já pronto no build.
 */
export function seoDoKit(produto: {
  nome: string;
  subcategoria?: string | null;
  descricao?: string | null;
}): { titulo: string; descricao: string } {
  const itens = itensDoKit(produto);
  const nome = nomeDoKitEmTitulo(produto.nome);
  const curtos = itens
    .map((item, i) => ({ curto: nomeCurtoDoItem(item), i }))
    .filter((c): c is { curto: { rotulo: string; prioridade: number }; i: number } => c.curto !== null)
    .sort((a, b) => a.curto.prioridade - b.curto.prioridade || a.i - b.i)
    .slice(0, 4)
    .map((c) => c.curto.rotulo);

  // Descrição na mesma ordem do título: o que se busca primeiro, tabaco no fim.
  const ordenados = itens
    .map((item, i) => ({ item, i, prioridade: nomeCurtoDoItem(item)?.prioridade ?? 9 }))
    .sort((a, b) => a.prioridade - b.prioridade || a.i - b.i)
    .map((x) => x.item);
  const textos = ordenados.map((item, i) => {
    const semUm = item.replace(/^1\s+/, '');
    return i === 0 ? semUm.charAt(0).toUpperCase() + semUm.slice(1) : semUm;
  });
  const lista =
    textos.length > 1 ? `${textos.slice(0, -1).join(', ')} e ${textos[textos.length - 1]}` : (textos[0] ?? '');
  const onde = ehKitCase(produto) ? 'no case rígido Alpha' : 'na embalagem exclusiva';

  return {
    titulo: curtos.length > 0 ? `${curtos.join(' + ')} | ${nome}` : `${nome} | Alpha Galerie`,
    descricao: lista
      ? `${lista}: kit exclusivo Alpha Galerie, ${onde}. Compre no site e receba em casa.`
      : `${nome}: kit exclusivo Alpha Galerie. Compre no site e receba em casa.`,
  };
}
