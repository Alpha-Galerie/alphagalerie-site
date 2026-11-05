import { useState } from 'react';
import { useKits } from '../hooks/useKits';
import { useCarrinhoActions } from '../hooks/useCarrinhoActions';
import type { Produto, Variacao } from '../types';
import ProductCard from './ProductCard';
import VariacoesModal from './VariacoesModal';
import styles from './KitsSection.module.css';

/**
 * Kits exclusivos da home: produtos da subcategoria "Kits Exclusivos", do mais
 * barato ao mais completo. O preço cheio de cada kit é a soma dos itens
 * avulsos, então o card já mostra o riscado e o selo de desconto.
 */
export default function KitsSection() {
  const { data: kits = [], isLoading } = useKits();
  const { adicionar, adicionarVariacao } = useCarrinhoActions();
  const [variacoesTarget, setVariacoesTarget] = useState<Produto | null>(null);

  if (isLoading || kits.length === 0) return null;

  function handleSelectVariacao(produto: Produto, variacao: Variacao) {
    adicionarVariacao(produto, variacao);
    setVariacoesTarget(null);
  }

  return (
    <section id="kits" className={styles.section} aria-label="Kits exclusivos">
      <div className={styles.inner}>
        <div className={styles.head}>
          <div>
            <div className="section-eyebrow">
              <span className={styles.selo} aria-hidden="true">✦</span> Exclusivo Alpha
            </div>
            <h2 className="section-title">
              Kits <em>exclusivos</em>.
            </h2>
          </div>
          <p className={styles.sub}>
            Pensados e desenvolvidos para quem realmente entende: do kit do dia a dia, no estojo
            exclusivo Alpha, ao <strong>Case Alpha</strong> completo. <strong>Só aqui.</strong>
          </p>
        </div>

        <div className={`products-grid-responsive ${styles.grid}`}>
          {kits.map((kit) => (
            <ProductCard
              key={kit.id}
              produto={kit}
              onAddToCart={adicionar}
              onOpenVariacoes={setVariacoesTarget}
              hideDestaqueBadge
            />
          ))}
        </div>
      </div>

      <VariacoesModal
        produto={variacoesTarget}
        onClose={() => setVariacoesTarget(null)}
        onSelect={handleSelectVariacao}
      />
    </section>
  );
}
