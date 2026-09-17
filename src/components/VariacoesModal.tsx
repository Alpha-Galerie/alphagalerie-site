// src/components/VariacoesModal.tsx
import { useEffect, useRef } from 'react';
import { formatCurrency as fmt } from '../lib/format';
import { getPrecoInfo } from '../lib/preco';
import type { Produto, Variacao } from '../types';

interface VariacoesModalProps {
  produto: Produto | null;
  onClose: () => void;
  onSelect: (produto: Produto, variacao: Variacao) => void;
}

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])';

export default function VariacoesModal({ produto, onClose, onSelect }: VariacoesModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!produto) return;
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
  }, [produto, onClose]);

  if (!produto) return null;

  const variacoes = produto._variacoes ?? [];

  return (
    <>
      {/* Overlay */}
      <div
        style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
          zIndex: 300, animation: 'fadeIn 0.2s ease',
        }}
        onPointerDown={onClose}
        aria-hidden="true"
      />

      {/* Dialog */}
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="variacoes-title"
        style={{
          position: 'fixed',
          top: '50%', left: '50%',
          transform: 'translate(-50%,-50%)',
          width: '90%', maxWidth: 480,
          maxHeight: '80vh',
          background: '#0a0a0a',
          border: '1px solid rgba(201,169,97,0.2)',
          borderRadius: 4,
          display: 'flex', flexDirection: 'column',
          zIndex: 301,
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1.25rem 1.5rem', borderBottom: '1px solid rgba(201,169,97,0.12)' }}>
          <h2
            id="variacoes-title"
            style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '1.25rem', color: '#f4f4f4', margin: 0 }}
          >
            {produto.nome}
          </h2>
          <button
            type="button"
            aria-label="Fechar"
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(244,244,244,0.6)', display: 'flex' }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div style={{ overflowY: 'auto', padding: '1rem 1.5rem' }}>
          {variacoes.length === 0 ? (
            <p style={{ color: 'rgba(244,244,244,0.4)', fontFamily: 'Inter, sans-serif', fontSize: '0.875rem' }}>
              Nenhuma variação disponível.
            </p>
          ) : (
            <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: '0.75rem' }} role="list">
              {variacoes.map((v) => {
                const preco = getPrecoInfo(produto, v).precoFinal;
                const esgotado = typeof v.estoque === 'number' && v.estoque <= 0;
                const ultimas = typeof v.estoque === 'number' && v.estoque > 0 && v.estoque <= 3;

                return (
                  <li key={v.id}>
                    <button
                      type="button"
                      disabled={esgotado}
                      onClick={() => onSelect(produto, v)}
                      aria-label={`Selecionar ${v.nome}${esgotado ? ' — esgotado' : ''}`}
                      style={{
                        width: '100%',
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: '0.875rem 1rem',
                        background: 'transparent',
                        border: `1px solid ${esgotado ? 'rgba(244,244,244,0.1)' : 'rgba(201,169,97,0.3)'}`,
                        borderRadius: 2,
                        cursor: esgotado ? 'not-allowed' : 'pointer',
                        opacity: esgotado ? 0.45 : 1,
                        gap: '0.75rem',
                      }}
                    >
                      <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.875rem', color: '#f4f4f4', textAlign: 'left', flex: 1 }}>
                        {v.nome}
                      </span>
                      {ultimas && !esgotado && (
                        <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.65rem', fontWeight: 600, letterSpacing: '0.1em', color: '#c9a961', padding: '0.15rem 0.4rem', border: '1px solid rgba(201,169,97,0.4)', borderRadius: 2 }} aria-hidden="true">
                          Últimas {v.estoque} un.
                        </span>
                      )}
                      {esgotado && (
                        <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.65rem', fontWeight: 600, letterSpacing: '0.1em', color: 'rgba(244,244,244,0.4)', padding: '0.15rem 0.4rem', border: '1px solid rgba(244,244,244,0.15)', borderRadius: 2 }} aria-hidden="true">
                          ESGOTADO
                        </span>
                      )}
                      <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.9rem', fontWeight: 700, color: '#c9a961', whiteSpace: 'nowrap' }}>
                        {fmt(preco)}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </>
  );
}
