import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import ProductGrid from './ProductGrid';
import type { Subcategoria } from '../hooks/useSubcategories';
import type { Marca } from '../hooks/useMarcas';

// A barra de subcategorias é o que o cliente enfrenta ao entrar na loja.
// Estes testes cobrem as duas queixas: 68 botões de uma vez em "Todos", e
// esgotado disputando espaço com o que dá para comprar.

const CATEGORIAS = [
  { id: 1, nome: 'Headshop', slug: 'headshop', ordem: 1, ativo: true, oculto: false },
  { id: 3, nome: 'Arguile', slug: 'arguile', ordem: 3, ativo: true, oculto: false },
];

// Subcategorias reais da categoria Headshop, na ordem que o banco devolve.
const SUBCATS_HEADSHOP: Subcategoria[] = [
  { nome: 'Headshop', total: 77, comEstoque: 62 },
  { nome: 'Tabaco', total: 30, comEstoque: 20 },
  { nome: 'Squadafum', total: 24, comEstoque: 19 },
  { nome: 'Raw', total: 20, comEstoque: 19 },
  { nome: 'Triturador', total: 22, comEstoque: 17 },
  { nome: 'Seda', total: 28, comEstoque: 16 },
  { nome: 'Nowdays', total: 16, comEstoque: 14 },
  { nome: 'Blunt', total: 10, comEstoque: 8 },
  { nome: 'Filtro', total: 8, comEstoque: 8 },
  { nome: 'Piteira', total: 9, comEstoque: 7 },
  { nome: 'Bolador', total: 2, comEstoque: 0 },
];

let subcatsDoHook: Subcategoria[] = [];
let categoryIdVisto: number | null = null;

// Marcas reais de Arguile > Essências, na ordem que o banco devolve.
const MARCAS_ESSENCIAS: Marca[] = [
  { nome: 'ADALYA', total: 20, comEstoque: 20 },
  { nome: 'ZIGGY', total: 20, comEstoque: 19 },
  { nome: 'NAY', total: 13, comEstoque: 13 },
  { nome: 'DEBAJ', total: 2, comEstoque: 2 },
  { nome: 'MR. LUCKY', total: 2, comEstoque: 2 },
  { nome: 'FUSION', total: 1, comEstoque: 1 },
  { nome: 'OFF MINT', total: 1, comEstoque: 0 },
];
let marcasDoHook: Marca[] = [];
let subcatVistaPelasMarcas: string | null | undefined;
let marcaFiltrada: string | null | undefined;

vi.mock('../hooks/useCategories', () => ({
  useCategories: () => ({ data: CATEGORIAS }),
}));
vi.mock('../hooks/useSubcategoriasOcultas', () => ({
  useSubcategoriasOcultas: () => ({ data: [] }),
}));
vi.mock('../hooks/useSubcategories', () => ({
  useSubcategories: (categoryId: number | null) => {
    categoryIdVisto = categoryId;
    // Espelha o hook real: em "Todos" não há barra de subcategoria.
    return { data: categoryId === null ? [] : subcatsDoHook };
  },
}));
vi.mock('../hooks/useMarcas', () => ({
  useMarcas: (categoryId: number | null, subcategoria: string | null) => {
    subcatVistaPelasMarcas = subcategoria;
    return { data: categoryId === null ? [] : marcasDoHook };
  },
}));
vi.mock('../hooks/useProducts', () => ({
  useProducts: (
    _cat: number | null, _page: number, _busca: string,
    _sub: string | null, _extra: number[], marca: string | null
  ) => {
    marcaFiltrada = marca;
    return { data: { produtos: [], total: 0, page: 0 }, isLoading: false, isFetching: false };
  },
}));
vi.mock('../hooks/useCarrinhoActions', () => ({
  useCarrinhoActions: () => ({ adicionar: vi.fn(), adicionarVariacao: vi.fn() }),
}));

function barra() {
  return screen.queryByRole('group', { name: /Filtrar por subcategoria/i });
}

function nomesNaBarra() {
  const b = barra();
  if (!b) return [];
  return within(b).getAllByRole('button').map((btn) => btn.textContent ?? '');
}

beforeEach(() => {
  subcatsDoHook = SUBCATS_HEADSHOP;
  categoryIdVisto = null;
  marcasDoHook = [];
  subcatVistaPelasMarcas = undefined;
  marcaFiltrada = undefined;
});

function barraMarcas() {
  return screen.queryByRole('group', { name: /Filtrar por marca/i });
}

describe('barra de subcategorias', () => {
  it('não aparece em "Todos" — era o que despejava as 68 de uma vez', () => {
    render(<ProductGrid categoryId={null} onCategoryChange={vi.fn()} />);
    expect(categoryIdVisto).toBeNull();
    expect(barra()).toBeNull();
  });

  it('dentro de uma categoria mostra 8 e recolhe o resto', () => {
    render(<ProductGrid categoryId={1} onCategoryChange={vi.fn()} />);
    const nomes = nomesNaBarra();
    // "Todas" + 8 subcategorias + o botão de expandir
    expect(nomes[0]).toMatch(/Todas/);
    expect(nomes).toHaveLength(10);
    expect(nomes[nomes.length - 1]).toMatch(/\+ 3 mais/);
  });

  it('respeita a ordem do banco: quem tem mais estoque vem primeiro', () => {
    render(<ProductGrid categoryId={1} onCategoryChange={vi.fn()} />);
    const nomes = nomesNaBarra();
    expect(nomes[1]).toMatch(/^Headshop/);
    expect(nomes[2]).toMatch(/^Tabaco/);
    // Bolador está esgotado e ficou na cauda, fora dos 8 primeiros
    expect(nomes.join(' ')).not.toMatch(/Bolador/);
  });

  it('mostra quantos itens existem disponíveis, não o catálogo inteiro', () => {
    render(<ProductGrid categoryId={1} onCategoryChange={vi.fn()} />);
    // Seda tem 28 cadastrados mas só 16 em estoque
    const seda = within(barra()!).getByRole('button', { name: /^Seda/ });
    expect(seda.textContent).toContain('16');
    expect(seda.textContent).not.toContain('28');
  });

  it('"+ N mais" abre a cauda e marca a subcategoria esgotada', () => {
    render(<ProductGrid categoryId={1} onCategoryChange={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: /\+ 3 mais/ }));

    const bolador = within(barra()!).getByRole('button', { name: /^Bolador/ });
    expect(bolador.textContent).toContain('esgotado');
    expect(screen.getByRole('button', { name: /ver menos/ })).toBeInTheDocument();
  });

  it('a subcategoria escolhida não some da barra quando está na cauda', () => {
    render(<ProductGrid categoryId={1} onCategoryChange={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: /\+ 3 mais/ }));
    fireEvent.click(within(barra()!).getByRole('button', { name: /^Bolador/ }));
    fireEvent.click(screen.getByRole('button', { name: /ver menos/ }));

    // Recolheu a cauda, mas Bolador continua visível porque está selecionado
    expect(within(barra()!).getByRole('button', { name: /^Bolador/ })).toBeInTheDocument();
  });

  it('sem cauda, não oferece "+ N mais"', () => {
    subcatsDoHook = SUBCATS_HEADSHOP.slice(0, 4);
    render(<ProductGrid categoryId={1} onCategoryChange={vi.fn()} />);
    expect(screen.queryByRole('button', { name: /mais$/ })).toBeNull();
    expect(nomesNaBarra()).toHaveLength(5);
  });
});

describe('barra de marcas', () => {
  it('não aparece em "Todos"', () => {
    marcasDoHook = MARCAS_ESSENCIAS;
    render(<ProductGrid categoryId={null} onCategoryChange={vi.fn()} />);
    expect(barraMarcas()).toBeNull();
  });

  it('não aparece com uma marca só — seria um botão que não filtra nada', () => {
    marcasDoHook = [MARCAS_ESSENCIAS[0]];
    render(<ProductGrid categoryId={3} onCategoryChange={vi.fn()} />);
    expect(barraMarcas()).toBeNull();
  });

  it('lista as marcas na ordem do banco, com o disponível de cada uma', () => {
    marcasDoHook = MARCAS_ESSENCIAS;
    render(<ProductGrid categoryId={3} onCategoryChange={vi.fn()} />);
    const nomes = within(barraMarcas()!).getAllByRole('button').map((b) => b.textContent ?? '');
    expect(nomes[0]).toMatch(/Todas as marcas/i);
    expect(nomes[1]).toMatch(/^ADALYA/);
    expect(nomes[1]).toContain('20');
    expect(nomes[2]).toMatch(/^ZIGGY/);
  });

  it('marca esgotada fica marcada em vez de mostrar zero', () => {
    marcasDoHook = MARCAS_ESSENCIAS;
    render(<ProductGrid categoryId={3} onCategoryChange={vi.fn()} />);
    const off = within(barraMarcas()!).getByRole('button', { name: /^OFF MINT/ });
    expect(off.textContent).toContain('esgotado');
  });

  it('clicar numa marca filtra os produtos por ela', () => {
    marcasDoHook = MARCAS_ESSENCIAS;
    render(<ProductGrid categoryId={3} onCategoryChange={vi.fn()} />);
    expect(marcaFiltrada).toBeNull();
    fireEvent.click(within(barraMarcas()!).getByRole('button', { name: /^ADALYA/ }));
    expect(marcaFiltrada).toBe('ADALYA');
  });

  it('clicar de novo na mesma marca desliga o filtro', () => {
    marcasDoHook = MARCAS_ESSENCIAS;
    render(<ProductGrid categoryId={3} onCategoryChange={vi.fn()} />);
    const alvo = () => within(barraMarcas()!).getByRole('button', { name: /^ADALYA/ });
    fireEvent.click(alvo());
    expect(marcaFiltrada).toBe('ADALYA');
    fireEvent.click(alvo());
    expect(marcaFiltrada).toBeNull();
  });

  it('as marcas seguem a subcategoria escolhida', () => {
    marcasDoHook = MARCAS_ESSENCIAS;
    subcatsDoHook = SUBCATS_HEADSHOP;
    render(<ProductGrid categoryId={1} onCategoryChange={vi.fn()} />);
    expect(subcatVistaPelasMarcas).toBeNull();
    fireEvent.click(within(barra()!).getByRole('button', { name: /^Seda/ }));
    expect(subcatVistaPelasMarcas).toBe('Seda');
  });

  it('trocar de subcategoria limpa a marca — senão a lista viria vazia', () => {
    marcasDoHook = MARCAS_ESSENCIAS;
    subcatsDoHook = SUBCATS_HEADSHOP;
    render(<ProductGrid categoryId={1} onCategoryChange={vi.fn()} />);
    fireEvent.click(within(barraMarcas()!).getByRole('button', { name: /^ADALYA/ }));
    expect(marcaFiltrada).toBe('ADALYA');
    fireEvent.click(within(barra()!).getByRole('button', { name: /^Seda/ }));
    expect(marcaFiltrada).toBeNull();
  });

  it('com muitas marcas, recolhe a cauda', () => {
    marcasDoHook = Array.from({ length: 37 }, (_, i) => ({
      nome: `MARCA ${i + 1}`, total: 3, comEstoque: 3,
    }));
    render(<ProductGrid categoryId={1} onCategoryChange={vi.fn()} />);
    const nomes = within(barraMarcas()!).getAllByRole('button').map((b) => b.textContent ?? '');
    expect(nomes).toHaveLength(10);
    expect(nomes[nomes.length - 1]).toMatch(/\+ 29 marcas/);
  });
});
