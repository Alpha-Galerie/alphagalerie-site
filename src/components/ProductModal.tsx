// src/components/ProductModal.tsx
import { useEffect, useRef, useState } from 'react';
import { useCartStore } from '../store/cart';
import { useToastStore } from '../store/toast';
import { formatCurrency } from '../lib/format';
import type { Produto, Variacao } from '../types';
import { useProduct } from '../hooks/useProduct';
import { buildProductPath } from '../lib/productPath';
import VariacoesModal from './VariacoesModal';

interface ProductModalProps {
  produtoId: number | null;
  onClose: () => void;
}

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])';

export default function ProductModal({ produtoId, onClose }: ProductModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const [showVariacoes, setShowVariacoes] = useState(false);
  const addItem = useCartStore((s) => s.addItem);
  const showToast = useToastStore((s) => s.showToast);

  const { data: produto, isLoading } = useProduct(produtoId);

  useEffect(() => {
    if (!produtoId) return;
    const dialog = dialogRef.current;
    if (!dialog) return;

    const focusables = Array.from(dialog.querySelectorAll<HTMLElement>(FOCUSABLE));
    if (focusables.length) focusables[0].focus();

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') { onClose(); return; }
      if (e.key === 'Tab') {
        if (focusables.length === 0) { e.preventDefault(); return; }
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (e.shiftKey) {
          if (document.activeElement === first) { e.preventDefault(); last.focus(); }
        } else {
          if (document.activeElement === last) { e.preventDefault(); first.focus(); }
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [produtoId, onClose]);

  if (!produtoId) return null;

  const shareUrl = produto
    ? `${globalThis.location.origin}${buildProductPath(produto)}`
    : `${globalThis.location.origin}/?p=${produtoId}`;

  async function handleShare() {
    if (navigator.share && produto) {
      try {
        await navigator.share({ title: produto.nome, text: `${produto.nome} — Alpha Galerie`, url: shareUrl });
        return;
      } catch { /* fall through */ }
    }
    try { await navigator.clipboard.writeText(shareUrl); } catch { /* silent */ }
  }

  function handleAddToCart() {
    if (!produto) return;
    if (produto._variacoes.length > 0) {
      setShowVariacoes(true);
      return;
    }
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
    onClose();
  }

  function handleSelectVariacao(produtoSelecionado: Produto, variacao: Variacao) {
    addItem(produtoSelecionado, variacao);
    showToast({
      id: produtoSelecionado.id,
      cartKey: `${produtoSelecionado.id}::${variacao.id}`,
      variacaoId: variacao.id,
      nome: produtoSelecionado.nome,
      variacao: variacao.nome,
      marca: produtoSelecionado.marca,
      categoria: produtoSelecionado.categorias?.nome ?? '',
      preco: variacao.preco ?? produtoSelecionado.preco_pix ?? produtoSelecionado.preco,
      imagem: produtoSelecionado.imagem_url,
      estoque: variacao.estoque,
      qtd: 1,
    });
    setShowVariacoes(false);
    onClose();
  }

  const modalStyle: React.CSSProperties = {
    position: 'fixed',
    top: '50%', left: '50%',
    transform: 'translate(-50%,-50%)',
    width: '90%', maxWidth: 640,
    maxHeight: '90vh',
    background: '#0a0a0a',
    border: '1px solid rgba(201,169,97,0.2)',
    borderRadius: 4,
    display: 'flex', flexDirection: 'column',
    zIndex: 351,
    overflowY: 'auto',
  };

  return (
    <>
      <div
        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 350 }}
        onPointerDown={onClose}
        aria-hidden="true"
      />

      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={produto?.nome ?? 'Produto'}
        style={modalStyle}
      >
        <button
          type="button"
          aria-label="Fechar"
          onClick={onClose}
          style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(244,244,244,0.6)', display: 'flex', zIndex: 1 }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>

        {isLoading && (
          <div role="status" aria-live="polite" style={{ padding: '3rem', textAlign: 'center', color: 'rgba(244,244,244,0.4)', fontFamily: 'Inter, sans-serif' }}>
            Carregando...
          </div>
        )}

        {!isLoading && produto && (
          <div style={{ display: 'grid', gridTemplateColumns: produto.imagem_url ? '1fr 1fr' : '1fr', gap: 0 }}>
            {produto.imagem_url && (
              <div style={{ aspectRatio: '1/1', overflow: 'hidden', background: '#1a1a1a' }}>
                <img
                  src={produto.imagem_url}
                  alt={produto.nome}
                  style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                />
              </div>
            )}

            <div style={{ padding: '2rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.65rem', fontWeight: 600, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#c9a961', margin: '0 0 0.5rem' }}>
                  {produto.marca}
                </p>
                <h2 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '1.5rem', fontWeight: 600, color: '#f4f4f4', margin: 0, lineHeight: 1.3 }}>
                  {produto.nome}
                </h2>
              </div>

              {produto.descricao && (
                <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.875rem', color: 'rgba(244,244,244,0.6)', lineHeight: 1.7, margin: 0 }}>
                  {produto.descricao}
                </p>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                {produto.preco_pix && (
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
                    <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '1.25rem', fontWeight: 700, color: '#f4f4f4' }}>
                      {formatCurrency(produto.preco_pix)}
                    </span>
                    <small style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.7rem', color: 'rgba(244,244,244,0.4)', letterSpacing: '0.08em' }}>PIX</small>
                  </div>
                )}
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
                  <span style={{ fontFamily: 'Inter, sans-serif', fontSize: produto.preco_pix ? '0.9rem' : '1.25rem', fontWeight: produto.preco_pix ? 400 : 700, color: produto.preco_pix ? 'rgba(244,244,244,0.45)' : '#f4f4f4' }}>
                    {formatCurrency(produto.preco)}
                  </span>
                  <small style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.7rem', color: 'rgba(244,244,244,0.4)', letterSpacing: '0.08em' }}>cartao</small>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: 'auto' }}>
                <button
                  type="button"
                  onClick={handleAddToCart}
                  disabled={!produto.ativo}
                  aria-label={`Adicionar ${produto.nome} ao carrinho`}
                  style={{ padding: '0.875rem 1rem', background: produto.ativo ? '#c9a961' : 'rgba(244,244,244,0.1)', color: produto.ativo ? '#0a0a0a' : 'rgba(244,244,244,0.35)', border: 'none', fontFamily: 'Inter, sans-serif', fontWeight: 700, fontSize: '0.75rem', letterSpacing: '0.12em', textTransform: 'uppercase', cursor: produto.ativo ? 'pointer' : 'not-allowed', borderRadius: 2 }}
                >
                  {produto.ativo
                    ? produto._variacoes.length > 0
                      ? 'SELECIONAR VARIAÇÃO'
                      : 'ADICIONAR AO CARRINHO'
                    : 'ESGOTADO'}
                </button>

                <button
                  type="button"
                  onClick={handleShare}
                  aria-label="Compartilhar produto"
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', padding: '0.75rem 1rem', background: 'transparent', border: '1px solid rgba(244,244,244,0.15)', color: 'rgba(244,244,244,0.6)', fontFamily: 'Inter, sans-serif', fontSize: '0.75rem', letterSpacing: '0.08em', cursor: 'pointer', borderRadius: 2 }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" />
                    <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" /><line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
                  </svg>
                  Compartilhar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <VariacoesModal
        produto={showVariacoes ? produto ?? null : null}
        onClose={() => setShowVariacoes(false)}
        onSelect={handleSelectVariacao}
      />
    </>
  );
}
