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
import { registrarInteresse } from '../lib/interesse';
import { KITS_SUBCATEGORIA, seoDoKit } from '../lib/kits';
import {
  OG_IMAGEM_PADRAO,
  SEO_PADRAO,
  SITE_URL,
  aplicarSeo,
  definirJsonLd,
  restaurarSeoPadrao,
  resumirDescricao,
} from '../lib/seo';

const CheckoutModal = lazy(() => import('../components/checkout/CheckoutModal'));

function toAbsoluteUrl(url: string): string {
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  return `${SITE_URL}${url.startsWith('/') ? '' : '/'}${url}`;
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
 * O id é o mesmo do bloco que o build já grava no HTML: este substitui aquele
 * com o preço e o estoque do momento.
 */
function upsertProdutoJsonLd(dados: Record<string, unknown> | null) {
  definirJsonLd('ld-produto', dados);
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

  // Produto aberto = interesse; o painel cruza com as vendas para achar o
  // que muita gente olha e pouca gente compra (candidato a promoção).
  useEffect(() => {
    if (produto?.id) registrarInteresse({ tipo: 'produto', produto_id: produto.id });
  }, [produto?.id]);
  const { adicionar } = useCarrinhoActions();
  const produtoComoItens = useMemo(() => (produto ? [produto] : []), [produto]);

  useEffect(() => {
    if (produto) {
      const pageUrl = `${SITE_URL}${buildProductPath(produto)}`;
      const imageUrl = produto.imagem_url ? toAbsoluteUrl(produto.imagem_url) : OG_IMAGEM_PADRAO;
      const ehKit = produto.subcategoria === KITS_SUBCATEGORIA;
      const seoKit = ehKit ? seoDoKit(produto) : null;
      const title = seoKit?.titulo ?? `${produto.nome} | ALPHA GALERIE`;
      const description = resumirDescricao(
        seoKit?.descricao ??
          (produto.descricao && produto.descricao.trim().length > 0
            ? produto.descricao
            : `${produto.nome} ${produto.marca ? `da ${produto.marca}` : ''} na Alpha Galerie.`)
      );

      aplicarSeo({ titulo: title, descricao: description, url: pageUrl, imagem: imageUrl, tipo: 'product' });

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
          seller: { '@type': 'Store', name: 'Alpha Galerie', '@id': `${SITE_URL}/#loja` },
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

    document.title = SEO_PADRAO.titulo;
  }, [produto, isLoading, isError]);

  // Sem isto o JSON-LD do último produto continuaria na home depois de
  // navegar para trás, descrevendo a página errada para o buscador.
  useEffect(() => () => upsertProdutoJsonLd(null), []);

  useEffect(() => () => restaurarSeoPadrao(), []);

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

              {produto.subcategoria === 'Kits Exclusivos' && (
                <p className={styles.soNoSite}>
                  ✦ Exclusivo: só no site da Alpha Galerie. Não vendemos em marketplace nem em outras lojas.
                </p>
              )}

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
