import { getPrecoInfo } from './preco';
import type { Produto } from '../types';

/**
 * "Combina com": quem leva seda leva piteira e isqueiro, quem leva piteira
 * leva seda, quem leva tabaco leva seda... A regra é por tipo de produto, que
 * sai da subcategoria cadastrada e, quando ela é uma marca (Raw, Nowdays,
 * Squadafum), do nome do produto.
 */
export type TipoProduto =
  | 'seda'
  | 'piteira'
  | 'tabaco'
  | 'isqueiro'
  | 'filtro'
  | 'blunt'
  | 'triturador'
  | 'bolador'
  | 'fumo_pronto'
  | 'essencia'
  | 'carvao'
  | 'arguile'
  | 'charuto';

interface DefinicaoTipo {
  tipo: TipoProduto;
  /** Subcategorias (normalizadas: minúsculas, sem acento) que são deste tipo. */
  subcategorias: string[];
  /** Nome do produto, para quando a subcategoria não diz o que ele é. */
  nome?: RegExp;
}

// A ordem importa: o primeiro que casar pelo nome vence ("seda c/ piteira" é seda).
const TIPOS: DefinicaoTipo[] = [
  { tipo: 'seda', subcategorias: ['seda'], nome: /\bsedas?\b|\bpapel\b|\bking size\b|\bslim size\b|\brolling paper/ },
  { tipo: 'piteira', subcategorias: ['piteira', 'piteira de vidro'], nome: /\bpiteiras?\b|\btips\b/ },
  { tipo: 'filtro', subcategorias: ['filtro'], nome: /\bfiltros?\b/ },
  { tipo: 'tabaco', subcategorias: ['tabaco'], nome: /\btabaco\b|\bblend\b/ },
  { tipo: 'isqueiro', subcategorias: ['isqueiro', 'macarico'], nome: /\bisqueiro\b|\bbic\b|\bclipper\b|\bzippo\b|\bmacarico\b/ },
  { tipo: 'blunt', subcategorias: ['blunt'], nome: /\bblunts?\b|\bwraps?\b/ },
  { tipo: 'triturador', subcategorias: ['triturador'], nome: /\btriturador\b|\bgrinder\b|\bdichavador\b/ },
  { tipo: 'bolador', subcategorias: ['bolador'], nome: /\bbolador\b/ },
  { tipo: 'fumo_pronto', subcategorias: ['palheiros', 'cigarros', 'cigarrilhas'] },
  { tipo: 'essencia', subcategorias: ['essencias'] },
  { tipo: 'carvao', subcategorias: ['carvao'], nome: /\bcarvao\b/ },
  { tipo: 'arguile', subcategorias: ['arguile', 'arguile completo'] },
  { tipo: 'charuto', subcategorias: ['charutos'], nome: /\bcharutos?\b/ },
];

/** O que oferecer para cada tipo, do mais para o menos óbvio. */
export const COMBINA_COM: Record<TipoProduto, TipoProduto[]> = {
  seda: ['piteira', 'isqueiro', 'tabaco', 'filtro'],
  piteira: ['seda', 'isqueiro', 'tabaco'],
  tabaco: ['seda', 'piteira', 'isqueiro', 'filtro'],
  filtro: ['seda', 'tabaco', 'isqueiro'],
  isqueiro: ['seda', 'piteira', 'tabaco'],
  blunt: ['isqueiro', 'triturador'],
  triturador: ['seda', 'piteira', 'isqueiro'],
  bolador: ['seda', 'piteira', 'tabaco'],
  fumo_pronto: ['isqueiro'],
  essencia: ['carvao'],
  carvao: ['essencia'],
  arguile: ['essencia', 'carvao'],
  charuto: ['isqueiro'],
};

export const MAX_SUGESTOES = 3;

function normalizar(texto: string | null | undefined): string {
  return (texto ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();
}

export function classificarProduto(produto: {
  nome: string;
  subcategoria?: string | null;
}): TipoProduto | null {
  const sub = normalizar(produto.subcategoria);
  const porSub = TIPOS.find((t) => t.subcategorias.includes(sub));
  if (porSub) return porSub.tipo;

  const nome = normalizar(produto.nome);
  const porNome = TIPOS.find((t) => t.nome?.test(nome));
  return porNome?.tipo ?? null;
}

/**
 * Tipos a oferecer para o que já está escolhido, sem repetir o que o cliente
 * já tem. Intercala as listas: com seda + tabaco no carrinho sai piteira,
 * isqueiro, filtro.
 */
export function tiposParaOferecer(
  itens: Array<{ nome: string; subcategoria?: string | null }>
): TipoProduto[] {
  const presentes = new Set(
    itens.map(classificarProduto).filter((t): t is TipoProduto => t !== null)
  );
  const listas = [...presentes].map((t) => COMBINA_COM[t]);
  const resultado: TipoProduto[] = [];
  const maior = Math.max(0, ...listas.map((l) => l.length));
  for (let i = 0; i < maior; i++) {
    for (const lista of listas) {
      const tipo = lista[i];
      if (tipo && !presentes.has(tipo) && !resultado.includes(tipo)) resultado.push(tipo);
    }
  }
  return resultado;
}

/** Subcategorias a buscar no banco para os tipos pedidos. */
export function subcategoriasDosTipos(tipos: TipoProduto[]): string[] {
  return TIPOS.filter((t) => tipos.includes(t.tipo)).flatMap((t) => t.subcategorias);
}

function disponivelEmUmToque(p: Produto): boolean {
  if (!p.ativo) return false;
  if (p._variacoes.length > 0) return false;
  return p.estoque === null || p.estoque > 0;
}

/**
 * Escolhe um produto por tipo. A retaguarda manda: produto marcado como
 * destaque vem antes, depois promoção, depois o mais barato — o complemento
 * que o cliente leva sem pensar (a BIC do lado do caixa).
 */
export function escolherSugestoes(
  candidatos: Produto[],
  tipos: TipoProduto[],
  idsNoCarrinho: Iterable<number>,
  limite = MAX_SUGESTOES
): Produto[] {
  const excluir = new Set(idsNoCarrinho);
  const porTipo = new Map<TipoProduto, Produto[]>();

  for (const p of candidatos) {
    if (excluir.has(p.id) || !disponivelEmUmToque(p)) continue;
    const tipo = classificarProduto(p);
    if (!tipo || !tipos.includes(tipo)) continue;
    const lista = porTipo.get(tipo) ?? [];
    lista.push(p);
    porTipo.set(tipo, lista);
  }

  const escolhidos: Produto[] = [];
  for (const tipo of tipos) {
    if (escolhidos.length >= limite) break;
    const lista = porTipo.get(tipo);
    if (!lista?.length) continue;
    const [melhor] = lista.slice().sort((a, b) => {
      if (a.destaque !== b.destaque) return a.destaque ? -1 : 1;
      const pa = getPrecoInfo(a);
      const pb = getPrecoInfo(b);
      if (pa.emPromocao !== pb.emPromocao) return pa.emPromocao ? -1 : 1;
      return pa.precoFinal - pb.precoFinal;
    });
    escolhidos.push(melhor);
  }
  return escolhidos;
}
