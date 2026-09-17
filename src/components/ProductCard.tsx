import type { FC } from 'react';
import { Link } from 'react-router-dom';
import type { Produto } from '../types';
import { formatCurrency } from '../lib/format';
import { getPrecoInfo } from '../lib/preco';
import { buildProductPath } from '../lib/productPath';
import styles from './ProductCard.module.css';

interface ProductCardProps {
  produto: Produto;
  onAddToCart: (produto: Produto) => void;
  onOpenVariacoes: (produto: Produto) => void;
  /** Na vitrine de destaques o selo "Destaque" é redundante. */
  hideDestaqueBadge?: boolean;
}

const PlaceholderIcon: FC = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
    <circle cx="8.5" cy="8.5" r="1.5" />
    <polyline points="21 15 16 10 5 21" />
  </svg>
);

const ProductCard: FC<ProductCardProps> = ({
  produto,
  onAddToCart,
  onOpenVariacoes,
  hideDestaqueBadge = false,
}) => {
  const esgotado = produto.estoque !== null && produto.estoque === 0;
  const temVariacoes = produto._variacoes && produto._variacoes.length > 0;
  const productPath = buildProductPath(produto);
  const preco = getPrecoInfo(produto);

  const handleCta = () => {
    if (esgotado) return;
    if (temVariacoes) {
      onOpenVariacoes(produto);
    } else {
      onAddToCart(produto);
    }
  };

  return (
    <article className={`${styles.product}${esgotado ? ` ${styles.esgotado}` : ''}`}>
      <Link to={productPath} className={styles.imageLink} aria-label={`Ver detalhes de ${produto.nome}`}>
        <div className={styles.imageWrapper}>
        {produto.imagem_url ? (
          <img
            src={produto.imagem_url}
            alt={produto.nome}
            className={styles.productImg}
            width={300}
            height={300}
            loading="lazy"
            decoding="async"
          />
        ) : (
          <div className={styles.imgPlaceholder} aria-hidden="true">
            <PlaceholderIcon />
          </div>
        )}
        <div className={styles.badgesWrapper}>
          {preco.emPromocao && (
            <span className={`${styles.badge} ${styles.badgePromo}`}>-{preco.desconto}%</span>
          )}
          {produto.destaque && !hideDestaqueBadge && !preco.emPromocao && (
            <span className={`${styles.badge} ${styles.badgeDestaque}`}>Destaque</span>
          )}
          {esgotado && (
            <span className={`${styles.badge} ${styles.badgeEsgotado}`}>Esgotado</span>
          )}
        </div>
        </div>
      </Link>

      <div className={styles.productInfo}>
        <p className={styles.productMarca}>{produto.marca}</p>
        <h3 className={styles.productName}>
          <Link to={productPath} className={styles.nameLink}>
            {produto.nome}
          </Link>
        </h3>

        {produto.descricao && (
          <p className={styles.productDescription}>
            {produto.descricao}
          </p>
        )}

        <div className={styles.productPrice}>
          {preco.precoDe !== null && (
            <span className={styles.priceOld}>
              <span className={styles.srOnly}>De </span>
              {formatCurrency(preco.precoDe)}
            </span>
          )}
          <span className={styles.priceValue}>
            {formatCurrency(preco.precoPix ?? preco.precoVenda)}
          </span>
          {preco.precoPix !== null && <span className={styles.priceLabel}>no pix</span>}
        </div>

        <button
          type="button"
          className={styles.productCta}
          onClick={handleCta}
          disabled={esgotado}
          aria-label={
            esgotado
              ? `${produto.nome} — esgotado`
              : temVariacoes
              ? `Selecionar variação de ${produto.nome}`
              : `Adicionar ${produto.nome} ao carrinho`
          }
        >
          {temVariacoes ? 'Selecionar' : 'Adicionar'}
        </button>
      </div>
    </article>
  );
};

export default ProductCard;
