import { useState } from 'react';
import { useDestaques } from '../hooks/useDestaques';
import { useCarrinhoActions } from '../hooks/useCarrinhoActions';
import type { Produto, Variacao } from '../types';
import ProductCard from './ProductCard';
import VariacoesModal from './VariacoesModal';
import styles from './DestaquesSection.module.css';

/**
 * Vitrine de destaques da home: produtos marcados como "destaque" na
 * retaguarda, com as promoções (preço promocional) aparecendo primeiro e com
 * o selo de desconto.
 */
export default function DestaquesSection() {
  const { data: produtos = [], isLoading } = useDestaques();
  const { adicionar, adicionarVariacao } = useCarrinhoActions();
  const [variacoesTarget, setVariacoesTarget] = useState<Produto | null>(null);

  if (isLoading || produtos.length === 0) return null;

  function handleSelectVariacao(produto: Produto, variacao: Variacao) {
    adicionarVariacao(produto, variacao);
    setVariacoesTarget(null);
  }

  const temPromocao = produtos.some((p) => p.preco_promocional !== null);

  return (
    <section id="destaques" className={styles.section} aria-label="Destaques da semana">
      <div className="section-head">
        <div>
          <div className="section-eyebrow">
            <span className="num">01</span> Destaques
          </div>
          <h2 className="section-title">
            Os queridinhos <em>da casa</em>.
          </h2>
        </div>
        <p className="section-sub">
          {temPromocao
            ? 'Seleção da casa com preço de oportunidade. Enquanto durar o estoque.'
            : 'Seleção da casa: o que mais sai da vitrine, reunido num lugar só.'}
        </p>
      </div>

      <div className={styles.inner}>
        <div className={`products-grid-responsive ${styles.grid}`}>
          {produtos.map((produto) => (
            <ProductCard
              key={produto.id}
              produto={produto}
              onAddToCart={adicionar}
              onOpenVariacoes={setVariacoesTarget}
              hideDestaqueBadge
            />
          ))}
        </div>

        <a href="#produtos" className={styles.verTudo}>
          Ver toda a vitrine
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M5 12h14M12 5l7 7-7 7" />
          </svg>
        </a>
      </div>

      <VariacoesModal
        produto={variacoesTarget}
        onClose={() => setVariacoesTarget(null)}
        onSelect={handleSelectVariacao}
      />
    </section>
  );
}
