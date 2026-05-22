// src/components/ProductGrid.tsx
import { useState, useEffect, useMemo, useRef } from 'react';
import { useCategories } from '../hooks/useCategories';
import { useSubcategories } from '../hooks/useSubcategories';
import { useProducts } from '../hooks/useProducts';
import { useProductsFuse } from '../hooks/useProductsIndex';
import { useCartStore } from '../store/cart';
import { useToastStore } from '../store/toast';
import type { Produto, Variacao } from '../types';
import ProductCard from './ProductCard';
import VariacoesModal from './VariacoesModal';

interface ProductGridProps {
  categoryId: number | null;
  onCategoryChange: (id: number | null) => void;
  initialSearch?: string;
  initialSubcat?: string | null;
}

const PAGE_SIZE = 24;

function SkeletonCard() {
  return (
    <div
      style={{
        background: '#111',
        border: '1px solid rgba(244,244,244,0.07)',
        borderRadius: 2,
        overflow: 'hidden',
      }}
      aria-hidden="true"
    >
      <div
        style={{
          width: '100%',
          aspectRatio: '1/1',
          background: 'linear-gradient(90deg,#1a1a1a 25%,#222 50%,#1a1a1a 75%)',
          backgroundSize: '200% 100%',
          animation: 'shimmer 1.5s infinite',
        }}
      />
      <div style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        <div style={{ height: 12, width: '60%', background: '#222', borderRadius: 2 }} />
        <div style={{ height: 16, width: '80%', background: '#1e1e1e', borderRadius: 2 }} />
        <div style={{ height: 12, width: '40%', background: '#222', borderRadius: 2 }} />
      </div>
    </div>
  );
}

export default function ProductGrid({
  categoryId,
  onCategoryChange,
  initialSearch = '',
  initialSubcat = null,
}: ProductGridProps) {
  const [searchInput, setSearchInput] = useState(initialSearch);
  const [search, setSearch] = useState(initialSearch);
  const [activeSubcat, setActiveSubcat] = useState<string | null>(initialSubcat);
  const [page, setPage] = useState(0);
  const [variacoesTarget, setVariacoesTarget] = useState<Produto | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => { setPage(0); setActiveSubcat(null); setSearchInput(''); setSearch(''); }, [categoryId]);
  useEffect(() => { setPage(0); }, [search, activeSubcat]);

  const { data: categorias = [] } = useCategories();
  const { data: subcategorias = [] } = useSubcategories(categoryId);
  const fuse = useProductsFuse(categoryId, categorias);

  function handleSearchChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value;
    setSearchInput(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    // Only go to server if Fuse has no results for this query
    const fuseHits = val.trim() ? fuse.search(val.trim()) : [];
    if (fuseHits.length === 0) {
      debounceRef.current = setTimeout(() => setSearch(val), 400);
    }
  }

  const extraCategoryIds = useMemo(() =>
    categoryId === null && search.trim().length > 0
      ? categorias
          .filter((c) => c.nome.toLowerCase().includes(search.trim().toLowerCase()))
          .map((c) => c.id)
      : []
  , [categoryId, search, categorias]);

  const { data, isLoading, isFetching } = useProducts(categoryId, page, search, activeSubcat, extraCategoryIds);
  const addItem = useCartStore((s) => s.addItem);
  const showToast = useToastStore((s) => s.showToast);

  const serverProdutos = data?.produtos ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / PAGE_SIZE);

  const produtos = useMemo((): Produto[] => {
    const q = searchInput.trim();
    if (!q) return serverProdutos;
    const fuseHits = fuse.search(q).map((r) => r.item) as unknown as Produto[];
    if (fuseHits.length > 0) return fuseHits;
    // Fuse had no hits — fall back to server results
    return serverProdutos;
  }, [fuse, searchInput, serverProdutos]);

  function handleAddToCart(produto: Produto) {
    addItem(produto);
    showToast({
      id: produto.id,
      cartKey: String(produto.id),
      nome: produto.nome,
      marca: produto.marca,
      categoria: produto.categorias?.nome ?? '',
      preco: produto.preco_pix ?? produto.preco,
      imagem: produto.imagem_url,
      estoque: produto.estoque,
      qtd: 1,
    });
  }

  function handleSelectVariacao(produto: Produto, variacao: Variacao) {
    addItem(produto, variacao);
    showToast({
      id: produto.id,
      cartKey: `${produto.id}::${variacao.id}`,
      variacaoId: variacao.id,
      nome: produto.nome,
      variacao: variacao.nome,
      marca: produto.marca,
      categoria: produto.categorias?.nome ?? '',
      preco: variacao.preco ?? produto.preco_pix ?? produto.preco,
      imagem: produto.imagem_url,
      estoque: variacao.estoque,
      qtd: 1,
    });
    setVariacoesTarget(null);
  }

  const btnBase: React.CSSProperties = {
    padding: '12px 22px',
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: 11,
    letterSpacing: '0.15em',
    textTransform: 'uppercase',
    cursor: 'pointer',
    borderRadius: 999,
    transition: 'all 0.2s',
  };

  return (
    <section
      id="produtos"
      className="products-section"
      style={{ maxWidth: 1320, margin: '0 auto' }}
      aria-label="Produtos"
    >
      {/* Filtro de categorias */}
      <div
        className="filter-scroll"
        style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 48, paddingBottom: 32, borderBottom: '1px solid #1a1a1a', overflowX: 'auto', WebkitOverflowScrolling: 'touch' as React.CSSProperties['WebkitOverflowScrolling'], scrollbarWidth: 'none' as React.CSSProperties['scrollbarWidth'] }}
        role="group"
        aria-label="Filtrar por categoria"
      >
        <button
          type="button"
          onClick={() => { onCategoryChange(null); setActiveSubcat(null); }}
          style={{
            ...btnBase,
            border: `1px solid ${categoryId === null ? '#c9a961' : '#222'}`,
            background: categoryId === null ? '#c9a961' : 'transparent',
            color: categoryId === null ? '#000' : '#888',
          }}
        >
          Todos
        </button>
        {categorias.map((cat) => (
          <button
            key={cat.id}
            type="button"
            onClick={() => { onCategoryChange(cat.id); setActiveSubcat(null); }}
            style={{
              ...btnBase,
              border: `1px solid ${categoryId === cat.id ? '#c9a961' : '#222'}`,
              background: categoryId === cat.id ? '#c9a961' : 'transparent',
              color: categoryId === cat.id ? '#000' : '#888',
            }}
          >
            {cat.nome}
          </button>
        ))}
      </div>

      {/* Filtro de subcategorias (server-side, todas da categoria) */}
      {subcategorias.length > 0 && (
        <div
          className="filter-scroll"
          style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 24, overflowX: 'auto', WebkitOverflowScrolling: 'touch' as React.CSSProperties['WebkitOverflowScrolling'], scrollbarWidth: 'none' as React.CSSProperties['scrollbarWidth'] }}
          role="group"
          aria-label="Filtrar por subcategoria"
        >
          <button
            type="button"
            onClick={() => setActiveSubcat(null)}
            style={{
              ...btnBase,
              padding: '8px 16px',
              border: `1px solid ${activeSubcat === null ? '#c9a961' : '#222'}`,
              background: activeSubcat === null ? '#c9a961' : 'transparent',
              color: activeSubcat === null ? '#000' : '#888',
            }}
          >
            Todas
          </button>
          {subcategorias.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setActiveSubcat(s)}
              style={{
                ...btnBase,
                padding: '8px 16px',
                border: `1px solid ${activeSubcat === s ? '#c9a961' : '#222'}`,
                background: activeSubcat === s ? '#c9a961' : 'transparent',
                color: activeSubcat === s ? '#000' : '#888',
              }}
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {/* Campo de busca (server-side, debounced) — inclui categoria no placeholder */}
      <div style={{ position: 'relative', marginBottom: 32, maxWidth: 400 }}>
        <svg
          style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: '#555', pointerEvents: 'none' }}
          width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"
        >
          <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <label htmlFor="product-search" style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0,0,0,0)' }}>
          Buscar produtos
        </label>
        <input
          id="product-search"
          type="search"
          placeholder="Buscar por categoria, nome ou marca..."
          value={searchInput}
          onChange={handleSearchChange}
          style={{
            width: '100%',
            padding: '12px 16px 12px 42px',
            background: '#111',
            border: '1px solid #222',
            color: '#f4f4f4',
            fontFamily: 'Inter, sans-serif',
            fontSize: 14,
            borderRadius: 0,
            outline: 'none',
          }}
        />
      </div>

      {/* Total e estado de carregamento */}
      {!isLoading && total > 0 && (
        <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.75rem', color: 'rgba(244,244,244,0.35)', letterSpacing: '0.06em', marginBottom: '1.25rem' }}>
          {total} produto{total !== 1 ? 's' : ''} encontrado{total !== 1 ? 's' : ''}
          {isFetching && ' · atualizando...'}
        </p>
      )}

      {/* Grid */}
      {isLoading ? (
        <div
          style={{ display: 'grid', gap: 12 }}
          className="products-grid-responsive"
          aria-busy="true"
          aria-label="Carregando produtos"
        >
          {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : produtos.length === 0 ? (
        <div role="status" style={{ gridColumn: '1/-1', textAlign: 'center', padding: '80px 24px', color: '#888', fontFamily: "'Cormorant Garamond', serif", fontStyle: 'italic', fontSize: 22 }}>
          Nenhum produto encontrado.
        </div>
      ) : (
        <div
          className="products-grid-responsive"
          style={{
            display: 'grid',
            gap: 12,
            opacity: isFetching ? 0.7 : 1,
            transition: 'opacity 0.15s',
          }}
        >
          {produtos.map((produto) => (
            <ProductCard
              key={produto.id}
              produto={produto}
              onAddToCart={handleAddToCart}
              onOpenVariacoes={setVariacoesTarget}
            />
          ))}
        </div>
      )}

      {/* Paginação */}
      {totalPages > 1 && (
        <div
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', marginTop: '3rem', flexWrap: 'wrap' }}
          role="navigation"
          aria-label="Paginação"
        >
          <button
            type="button"
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
            aria-label="Página anterior"
            style={{
              ...btnBase,
              padding: '0.5rem 1rem',
              border: '1px solid rgba(244,244,244,0.15)',
              background: 'transparent',
              color: page === 0 ? 'rgba(244,244,244,0.2)' : 'rgba(244,244,244,0.6)',
              cursor: page === 0 ? 'not-allowed' : 'pointer',
            }}
          >
            ←
          </button>

          {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
            const pageNum = totalPages <= 7 ? i : (
              i === 0 ? 0 :
              i === 6 ? totalPages - 1 :
              page <= 2 ? i :
              page >= totalPages - 3 ? totalPages - 7 + i :
              page - 2 + i
            );
            return (
              <button
                key={pageNum}
                type="button"
                onClick={() => setPage(pageNum)}
                aria-current={page === pageNum ? 'page' : undefined}
                aria-label={`Página ${pageNum + 1}`}
                style={{
                  ...btnBase,
                  padding: '0.5rem 0.875rem',
                  border: `1px solid ${page === pageNum ? '#c9a961' : 'rgba(244,244,244,0.15)'}`,
                  background: page === pageNum ? 'rgba(201,169,97,0.1)' : 'transparent',
                  color: page === pageNum ? '#c9a961' : 'rgba(244,244,244,0.5)',
                  minWidth: 40,
                }}
              >
                {pageNum + 1}
              </button>
            );
          })}

          <button
            type="button"
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            disabled={page >= totalPages - 1}
            aria-label="Próxima página"
            style={{
              ...btnBase,
              padding: '0.5rem 1rem',
              border: '1px solid rgba(244,244,244,0.15)',
              background: 'transparent',
              color: page >= totalPages - 1 ? 'rgba(244,244,244,0.2)' : 'rgba(244,244,244,0.6)',
              cursor: page >= totalPages - 1 ? 'not-allowed' : 'pointer',
            }}
          >
            →
          </button>
        </div>
      )}

      {/* Modal de variações */}
      <VariacoesModal
        produto={variacoesTarget}
        onClose={() => setVariacoesTarget(null)}
        onSelect={handleSelectVariacao}
      />
    </section>
  );
}
