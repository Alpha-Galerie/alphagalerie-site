import { formatCurrency } from '../lib/format';
import { getPrecoInfo } from '../lib/preco';
import { useSugestoes } from '../hooks/useSugestoes';
import type { Produto } from '../types';
import styles from './Sugestoes.module.css';

interface SugestoesProps {
  /** O que o cliente já escolheu: itens do carrinho ou o produto aberto. */
  itens: Array<{ id: number; nome: string; subcategoria?: string | null }>;
  onAdd: (produto: Produto) => void;
  titulo?: string;
}

/**
 * "Combina com": oferece o complemento natural do que o cliente escolheu
 * (seda → piteira e isqueiro, tabaco → seda...). Só aparece quando há o que
 * oferecer, e só com produtos que entram no carrinho num toque.
 */
export default function Sugestoes({ itens, onAdd, titulo = 'Combina com seu pedido' }: SugestoesProps) {
  const sugestoes = useSugestoes(itens);
  if (sugestoes.length === 0) return null;

  return (
    <section className={styles.wrap} aria-label={titulo}>
      <p className={styles.titulo}>{titulo}</p>
      <ul className={styles.lista}>
        {sugestoes.map((produto) => {
          const preco = getPrecoInfo(produto);
          return (
            <li key={produto.id} className={styles.item}>
              <div className={styles.img} aria-hidden="true">
                {produto.imagem_url ? (
                  <img src={produto.imagem_url} alt="" width={48} height={48} loading="lazy" decoding="async" />
                ) : (
                  <span className={styles.placeholder} />
                )}
              </div>
              <div className={styles.info}>
                <span className={styles.nome}>{produto.nome}</span>
                <span className={styles.preco}>
                  {preco.precoDe !== null && (
                    <s className={styles.precoDe}>{formatCurrency(preco.precoDe)}</s>
                  )}
                  {formatCurrency(preco.precoFinal)}
                </span>
              </div>
              <button
                type="button"
                className={styles.add}
                onClick={() => onAdd(produto)}
                aria-label={`Adicionar ${produto.nome} ao carrinho`}
              >
                + Levar
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
