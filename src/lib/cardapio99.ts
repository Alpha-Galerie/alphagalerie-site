import type { Produto } from '../types';
import { getPrecoInfo } from './preco';

/**
 * Cardápio para marketplace de delivery (99 Food).
 *
 * O catálogo do site tem bong, cachimbo, CBD, esotérico — coisa que o
 * marketplace não aceita e que fez o cadastro ser reprovado quando mandamos
 * o link da loja inteira. Aqui a regra é o contrário: nada entra por padrão,
 * só o que está descrito nas seções abaixo (bebidas, tabaco, seda, essência,
 * alumínio, carvão, isqueiro, filtro e piteira).
 */

export interface ItemCardapio {
  id: number;
  nome: string;
  marca: string;
  descricao: string;
  preco: number;
  imagem: string | null;
  disponivel: boolean;
}

export interface SecaoCardapio {
  titulo: string;
  itens: ItemCardapio[];
}

/** O que o produto precisa ter para ser encaixado numa seção. */
type ProdutoCardapio = Pick<
  Produto,
  | 'id'
  | 'nome'
  | 'marca'
  | 'preco'
  | 'preco_pix'
  | 'preco_promocional'
  | 'categoria_id'
  | 'subcategoria'
  | 'estoque'
  | 'imagem_url'
  | 'descricao'
>;

interface RegraSecao {
  titulo: string;
  /** Vira a descrição do item quando o produto não tem uma no cadastro. */
  legenda: string;
  categorias: number[];
  /** Subcategorias aceitas. Ausente = o resto da categoria. */
  subcategorias?: string[];
  excetoSubcategorias?: string[];
  /** Peneira extra: papel alumínio mora na mesma subcategoria dos narguiles. */
  filtro?: (produto: ProdutoCardapio) => boolean;
}

const HEADSHOP = 1;
const CHARUTARIA = 2;
const ARGUILE = 3;
const BEBIDAS = 5;

/** Categorias buscadas no banco. O recorte fino é feito pelas seções. */
export const CATEGORIAS_CARDAPIO = [HEADSHOP, CHARUTARIA, ARGUILE, BEBIDAS];

const SECOES: RegraSecao[] = [
  {
    titulo: 'Bebidas',
    legenda: 'Bebida gelada',
    categorias: [BEBIDAS],
    excetoSubcategorias: ['destilados', 'laricas'],
  },
  {
    titulo: 'Destilados e vinhos',
    legenda: 'Garrafa',
    categorias: [BEBIDAS],
    subcategorias: ['destilados'],
  },
  {
    titulo: 'Para beliscar',
    legenda: 'Snack',
    categorias: [BEBIDAS],
    subcategorias: ['laricas'],
  },
  {
    titulo: 'Tabacos',
    legenda: 'Tabaco',
    categorias: [HEADSHOP, CHARUTARIA],
    subcategorias: ['tabaco'],
  },
  {
    titulo: 'Sedas',
    legenda: 'Seda',
    categorias: [HEADSHOP],
    subcategorias: ['seda'],
  },
  {
    titulo: 'Filtros',
    legenda: 'Filtro',
    categorias: [HEADSHOP],
    subcategorias: ['filtro'],
  },
  {
    titulo: 'Piteiras',
    legenda: 'Piteira',
    categorias: [HEADSHOP],
    subcategorias: ['piteira', 'piteira de vidro'],
  },
  {
    titulo: 'Isqueiros',
    legenda: 'Isqueiro',
    categorias: [HEADSHOP],
    subcategorias: ['isqueiro'],
  },
  {
    titulo: 'Essências de narguile',
    legenda: 'Essência para narguile',
    categorias: [ARGUILE],
    subcategorias: ['essencias'],
  },
  {
    titulo: 'Carvão',
    legenda: 'Carvão para narguile',
    categorias: [ARGUILE],
    subcategorias: ['carvao'],
  },
  {
    titulo: 'Papel alumínio',
    legenda: 'Papel alumínio para narguile',
    categorias: [ARGUILE],
    subcategorias: ['arguile'],
    filtro: (p) => /^alumi|^alumí/i.test(p.nome.trim()),
  },
];

function normalizar(valor: string | null | undefined): string {
  return (valor ?? '').trim().toLowerCase();
}

function combina(produto: ProdutoCardapio, regra: RegraSecao): boolean {
  if (!regra.categorias.includes(produto.categoria_id)) return false;

  const sub = normalizar(produto.subcategoria);
  if (regra.subcategorias && !regra.subcategorias.includes(sub)) return false;
  if (regra.excetoSubcategorias?.includes(sub)) return false;
  if (regra.filtro && !regra.filtro(produto)) return false;

  return true;
}

function descricaoDoItem(produto: ProdutoCardapio, legenda: string): string {
  const propria = (produto.descricao ?? '').replace(/\s+/g, ' ').trim();
  if (propria) return propria;

  const marca = produto.marca?.trim();
  // Marca repetida no nome ("RAW" em "RAW CLASSIC") só polui a descrição.
  if (marca && !normalizar(produto.nome).includes(normalizar(marca))) {
    return `${legenda} ${marca}`;
  }
  return legenda;
}

export interface OpcoesCardapio {
  /** Mantém no cardápio o que está com estoque zerado. Padrão: não. */
  incluirSemEstoque?: boolean;
}

/**
 * Agrupa os produtos nas seções do cardápio, na ordem em que aparecem acima.
 *
 * Sem estoque fica de fora por padrão: no delivery o cliente paga primeiro e
 * só depois a gente descobre que o item acabou — é cancelamento na certa.
 */
export function montarCardapio(
  produtos: ProdutoCardapio[],
  { incluirSemEstoque = false }: OpcoesCardapio = {}
): SecaoCardapio[] {
  return SECOES.map((regra) => {
    const itens = produtos
      .filter((p) => combina(p, regra))
      .filter((p) => incluirSemEstoque || (p.estoque ?? 0) > 0)
      .map((p) => ({
        id: p.id,
        nome: p.nome.trim(),
        marca: p.marca?.trim() ?? '',
        descricao: descricaoDoItem(p, regra.legenda),
        // Preço de venda, não o do Pix: no marketplace o cliente paga no app.
        preco: getPrecoInfo(p).precoVenda,
        imagem: p.imagem_url,
        disponivel: (p.estoque ?? 0) > 0,
      }))
      .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));

    return { titulo: regra.titulo, itens };
  }).filter((secao) => secao.itens.length > 0);
}

export function totalDeItens(secoes: SecaoCardapio[]): number {
  return secoes.reduce((soma, secao) => soma + secao.itens.length, 0);
}

function celula(valor: string): string {
  return /[";\n\r]/.test(valor) ? `"${valor.replace(/"/g, '""')}"` : valor;
}

/**
 * Só link público entra na coluna de foto.
 *
 * Parte do catálogo tem a imagem gravada como `data:image` (base64) dentro do
 * próprio campo — uma delas sozinha passa de 80 mil caracteres. Isso estoura a
 * célula da planilha e o marketplace não consegue baixar a foto de lá: para o
 * cadastro é o mesmo que não ter foto, e assim ao menos dá para ver quais
 * itens precisam de uma imagem enviada à mão.
 */
export function fotoPublica(imagem: string | null): string {
  const url = (imagem ?? '').trim();
  return /^https?:\/\//i.test(url) ? url : '';
}

/** Itens do cardápio sem foto que o marketplace consiga baixar. */
export function itensSemFoto(secoes: SecaoCardapio[]): number {
  return secoes.reduce(
    (soma, secao) => soma + secao.itens.filter((item) => !fotoPublica(item.imagem)).length,
    0
  );
}

const CABECALHO = ['Categoria', 'Item', 'Descrição', 'Preço (R$)', 'Código', 'Foto (URL)'];

/**
 * Planilha do cardápio para subir no cadastro do marketplace.
 *
 * Ponto e vírgula e BOM porque quem abre é o Excel em pt-BR: com vírgula ele
 * joga a linha inteira numa célula só, e sem BOM os acentos viram símbolo.
 */
export function gerarCsvCardapio(secoes: SecaoCardapio[]): string {
  const linhas = [CABECALHO.join(';')];

  for (const secao of secoes) {
    for (const item of secao.itens) {
      linhas.push(
        [
          secao.titulo,
          item.nome,
          item.descricao,
          item.preco.toFixed(2).replace('.', ','),
          String(item.id),
          fotoPublica(item.imagem),
        ]
          .map(celula)
          .join(';')
      );
    }
  }

  return `\ufeff${linhas.join('\r\n')}\r\n`;
}
