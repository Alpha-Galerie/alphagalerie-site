import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useKits } from '../hooks/useKits';
import { ehKitCase } from '../lib/kits';
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

  // Mesma ordem da página /kit: primeiro os kits do dia a dia, depois a linha
  // Case Alpha 2.0, cada grupo na sua fileira.
  const kitsDiaADia = kits.filter((k) => !ehKitCase(k));
  const kitsCase = kits.filter(ehKitCase);

  function handleSelectVariacao(produto: Produto, variacao: Variacao) {
    adicionarVariacao(produto, variacao);
    setVariacoesTarget(null);
  }

  function renderCard(kit: Produto) {
    return (
      <ProductCard
        key={kit.id}
        produto={kit}
        onAddToCart={adicionar}
        onOpenVariacoes={setVariacoesTarget}
        hideDestaqueBadge
      />
    );
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
            Pensados e desenvolvidos para quem realmente entende: do kit do dia a dia ao <strong>Case Alpha</strong> completo. <strong>Só no site da Alpha Galerie</strong>: não vendemos em marketplace nem em outras lojas.
            <br />
            <Link to="/kit" className={styles.verTodos}>Ver todos os kits →</Link>
          </p>
        </div>

        {kitsDiaADia.length > 0 && (
          <div className={`products-grid-responsive ${styles.grid}`}>
            {kitsDiaADia.map(renderCard)}
          </div>
        )}

        {kitsCase.length > 0 && (
          <>
            <h3 className={styles.grupo}>
              Case Alpha 2.0, <em>o seu setup completo</em>.
            </h3>
            <div className={`products-grid-responsive ${styles.grid}`}>
              {kitsCase.map(renderCard)}
            </div>
          </>
        )}
      </div>

      <VariacoesModal
        produto={variacoesTarget}
        onClose={() => setVariacoesTarget(null)}
        onSelect={handleSelectVariacao}
      />
    </section>
  );
}
