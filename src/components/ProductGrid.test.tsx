import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import ProductGrid from './ProductGrid';
import type { Subcategoria } from '../hooks/useSubcategories';

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
vi.mock('../hooks/useProducts', () => ({
  useProducts: () => ({ data: { produtos: [], total: 0, page: 0 }, isLoading: false, isFetching: false }),
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
});

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
    expect(nomes.at(-1)).toMatch(/\+ 3 mais/);
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
