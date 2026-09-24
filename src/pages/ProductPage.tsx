import { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import Header from '../components/Header';
import Footer from '../components/Footer';
import CartDrawer from '../components/CartDrawer';
import VariacoesModal from '../components/VariacoesModal';
import FloatingWhatsApp from '../components/FloatingWhatsApp';
import AddedToCartToast from '../components/AddedToCartToast';
import { useProduct } from '../hooks/useProduct';
import { useCarrinhoActions } from '../hooks/useCarrinhoActions';
import Sugestoes from '../components/Sugestoes';
import { formatCurrency } from '../lib/format';
import { getPrecoInfo } from '../lib/preco';
import { buildProductPath, extractProductIdFromParam } from '../lib/productPath';
import { useCartStore } from '../store/cart';
import { useToastStore } from '../store/toast';
import type { Produto, Variacao } from '../types';
import styles from './ProductPage.module.css';

const CheckoutModal = lazy(() => import('../components/checkout/CheckoutModal'));

const DEFAULT_TITLE = 'ALPHA GALERIE — Headshop, Charutaria, Arguile · Alphaville';
const DEFAULT_DESCRIPTION = 'Mais de 10 anos sendo a referencia em headshop, charutaria, arguile e lifestyle em Alphaville.';
const DEFAULT_OG_TITLE = 'ALPHA GALERIE — Alphaville';
const DEFAULT_OG_DESCRIPTION = 'Headshop · Charutaria · Arguile · Lifestyle · Alphaville/Barueri';
const DEFAULT_OG_IMAGE = 'https://alphagalerie.com/og-default.jpg';

function upsertMeta(attr: 'name' | 'property', key: string, content: string) {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

function upsertCanonical(href: string) {
  let canonical = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!canonical) {
    canonical = document.createElement('link');
    canonical.setAttribute('rel', 'canonical');
    document.head.appendChild(canonical);
  }
  canonical.setAttribute('href', href);
}

function toAbsoluteUrl(url: string): string {
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  return `${globalThis.location.origin}${url.startsWith('/') ? '' : '/'}${url}`;
}

function trimDescription(text: string): string {
  const cleaned = text.replace(/\s+/g, ' ').trim();
  if (cleaned.length <= 160) return cleaned;
  return `${cleaned.slice(0, 157)}...`;
}

/** Preço que a pessoa realmente vai pagar: o promocional quando ele existe
 *  e é menor, senão o preço cheio. Anunciar preço diferente do praticado faz
 *  o Google reprovar o resultado — e gera reclamação de cliente. */
function precoVigente(p: Produto): number {
  const cheio = Number(p.preco ?? 0);
  const promo = p.preco_promocional != null ? Number(p.preco_promocional) : null;
  return promo != null && promo > 0 && promo < cheio ? promo : cheio;
}

/**
 * Publica o JSON-LD de Produto na página. É o que permite ao Google mostrar
 * preço e disponibilidade direto no resultado da busca, em vez de só um link.
 */
function upsertProdutoJsonLd(dados: Record<string, unknown> | null) {
  const ID = 'ld-produto';
  document.getElementById(ID)?.remove();
  if (!dados) return;
  const el = document.createElement('script');
  el.id = ID;
  el.type = 'application/ld+json';
  el.textContent = JSON.stringify(dados);
  document.head.appendChild(el);
}

export default function ProductPage() {
  const { productSlug } = useParams();
  const produtoId = extractProductIdFromParam(productSlug);
  const [cartOpen, setCartOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [showVariacoes, setShowVariacoes] = useState(false);

  const addItem = useCartStore((s) => s.addItem);
  const showToast = useToastStore((s) => s.showToast);
  const { data: produto, isLoading, isError } = useProduct(produtoId);
  const { adicionar } = useCarrinhoActions();
  const produtoComoItens = useMemo(() => (produto ? [produto] : []), [produto]);

  useEffect(() => {
    if (produto) {
      const pageUrl = `${globalThis.location.origin}${buildProductPath(produto)}`;
      const imageUrl = produto.imagem_url ? toAbsoluteUrl(produto.imagem_url) : DEFAULT_OG_IMAGE;
      const title = `${produto.nome} | ALPHA GALERIE`;
      const description = trimDescription(
        produto.descricao && produto.descricao.trim().length > 0
          ? produto.descricao
          : `${produto.nome} ${produto.marca ? `da ${produto.marca}` : ''} na Alpha Galerie.`
      );

      document.title = title;
      upsertCanonical(pageUrl);
      upsertMeta('name', 'description', description);
      upsertMeta('property', 'og:type', 'product');
      upsertMeta('property', 'og:title', title);
      upsertMeta('property', 'og:description', description);
      upsertMeta('property', 'og:image', imageUrl);
      upsertMeta('property', 'og:url', pageUrl);
      upsertMeta('name', 'twitter:card', 'summary_large_image');
      upsertMeta('name', 'twitter:title', title);
      upsertMeta('name', 'twitter:description', description);
      upsertMeta('name', 'twitter:image', imageUrl);

      const emEstoque = (produto.estoque ?? 0) > 0;
      upsertProdutoJsonLd({
        '@context': 'https://schema.org',
        '@type': 'Product',
        name: produto.nome,
        description,
        image: imageUrl,
        sku: String(produto.id),
        ...(produto.marca ? { brand: { '@type': 'Brand', name: produto.marca } } : {}),
        ...(produto.categorias?.nome ? { category: produto.categorias.nome } : {}),
        offers: {
          '@type': 'Offer',
          url: pageUrl,
          priceCurrency: 'BRL',
          price: precoVigente(produto).toFixed(2),
          availability: emEstoque
            ? 'https://schema.org/InStock'
            : 'https://schema.org/OutOfStock',
          seller: { '@type': 'Store', name: 'Alpha Galerie', '@id': 'https://alphagalerie.com/#loja' },
        },
      });
      return;
    }

    if (isLoading) {
      document.title = 'Carregando produto | ALPHA GALERIE';
      return;
    }

    if (isError) {
      document.title = 'Produto nao encontrado | ALPHA GALERIE';
      return;
    }

    document.title = DEFAULT_TITLE;
  }, [produto, isLoading, isError]);

  // Sem isto o JSON-LD do último produto continuaria na home depois de
  // navegar para trás, descrevendo a página errada para o buscador.
  useEffect(() => () => upsertProdutoJsonLd(null), []);

  useEffect(() => {
    return () => {
      document.title = DEFAULT_TITLE;
      upsertCanonical('https://alphagalerie.com');
      upsertMeta('name', 'description', DEFAULT_DESCRIPTION);
      upsertMeta('property', 'og:type', 'website');
      upsertMeta('property', 'og:title', DEFAULT_OG_TITLE);
      upsertMeta('property', 'og:description', DEFAULT_OG_DESCRIPTION);
      upsertMeta('property', 'og:image', DEFAULT_OG_IMAGE);
      upsertMeta('property', 'og:url', 'https://alphagalerie.com');
      upsertMeta('name', 'twitter:card', 'summary_large_image');
      upsertMeta('name', 'twitter:title', DEFAULT_OG_TITLE);
      upsertMeta('name', 'twitter:description', DEFAULT_OG_DESCRIPTION);
      upsertMeta('name', 'twitter:image', DEFAULT_OG_IMAGE);
    };
  }, []);

  async function handleShare() {
    if (!produto) return;
    const shareUrl = `${globalThis.location.origin}${buildProductPath(produto)}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: produto.nome,
          text: `${produto.nome} — Alpha Galerie`,
          url: shareUrl,
        });
        return;
      } catch {
        // Fallback to clipboard when native share is canceled or unavailable.
      }
    }

    try {
      await navigator.clipboard.writeText(shareUrl);
    } catch {
      // Silent failure keeps UI simple.
    }
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
      preco: getPrecoInfo(produto).precoFinal,
      imagem: produto.imagem_url,
      estoque: produto.estoque,
      qtd: 1,
    });
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
      preco: getPrecoInfo(produtoSelecionado, variacao).precoFinal,
      imagem: produtoSelecionado.imagem_url,
      estoque: variacao.estoque,
      qtd: 1,
    });
    setShowVariacoes(false);
  }

  return (
    <>
      <Header onOpenCart={() => setCartOpen(true)} />

      <main id="main-content" className={styles.container}>
        <Link to="/" className={styles.backLink}>
          ← Voltar para a vitrine
        </Link>

        {!produtoId && (
          <div style={{ padding: '60px 0', color: 'rgba(244,244,244,0.7)', fontFamily: 'Inter, sans-serif' }}>
            Produto invalido.
          </div>
        )}

        {produtoId && isLoading && (
          <div role="status" style={{ padding: '60px 0', color: 'rgba(244,244,244,0.5)', fontFamily: 'Inter, sans-serif' }}>
            Carregando produto...
          </div>
        )}

        {produtoId && isError && (
          <div style={{ padding: '60px 0', color: 'rgba(244,244,244,0.7)', fontFamily: 'Inter, sans-serif' }}>
            Nao foi possivel carregar este produto.
          </div>
        )}

        {produto && (
          <article className={styles.article}>
            {produto.imagem_url && (
              <div className={styles.imageWrapper}>
                <img
                  src={produto.imagem_url}
                  alt={produto.nome}
                  className={styles.productImg}
                />
              </div>
            )}

            <div className={styles.infoSection}>
              <p className={styles.brand}>{produto.marca}</p>

              <h1 className={styles.title}>{produto.nome}</h1>

              {produto.descricao && <p className={styles.description}>{produto.descricao}</p>}

              <div className={styles.priceContainer}>
                {(() => {
                  const preco = getPrecoInfo(produto);
                  return (
                    <>
                      {preco.emPromocao && (
                        <p className={styles.priceOld}>
                          De {formatCurrency(preco.precoDe as number)}
                          <span className={styles.priceDiscount}>-{preco.desconto}%</span>
                        </p>
                      )}

                      {preco.precoPix !== null && (
                        <p className={styles.priceValue}>
                          {formatCurrency(preco.precoPix)}
                          <span className={styles.priceLabel}>PIX</span>
                        </p>
                      )}

                      <p className={preco.precoPix !== null ? styles.priceSecondary : styles.priceSecondary + ' ' + styles.noPrimaryPrice}>
                        {formatCurrency(preco.precoVenda)}
                        <span className={styles.priceLabel}>CARTAO</span>
                      </p>
                    </>
                  );
                })()}
              </div>

              <div className={styles.actions}>
                <button
                  type="button"
                  onClick={handleAddToCart}
                  disabled={!produto.ativo}
                  className={styles.btnPrimary}
                >
                  {produto.ativo
                    ? produto._variacoes.length > 0
                      ? 'Selecionar variacao'
                      : 'Adicionar ao carrinho'
                    : 'Esgotado'}
                </button>

                <button type="button" onClick={handleShare} className={styles.btnSecondary}>
                  Copiar link
                </button>
              </div>
            </div>
          </article>
        )}

        {produto && (
          <div className={styles.sugestoes}>
            <Sugestoes itens={produtoComoItens} onAdd={adicionar} titulo="Combina com este produto" />
          </div>
        )}
      </main>

      <Footer />

      <CartDrawer
        isOpen={cartOpen}
        onClose={() => setCartOpen(false)}
        onOpenCheckout={() => {
          setCartOpen(false);
          setCheckoutOpen(true);
        }}
      />

      {checkoutOpen && (
        <Suspense fallback={null}>
          <CheckoutModal onClose={() => setCheckoutOpen(false)} />
        </Suspense>
      )}

      <VariacoesModal
        produto={showVariacoes ? produto ?? null : null}
        onClose={() => setShowVariacoes(false)}
        onSelect={handleSelectVariacao}
      />

      <FloatingWhatsApp />
      <AddedToCartToast onOpenCart={() => setCartOpen(true)} />
    </>
  );
}
