import { lazy, Suspense, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useKits } from '../hooks/useKits';
import { useVisita } from '../hooks/useVisita';
import { useCarrinhoActions } from '../hooks/useCarrinhoActions';
import { ehKitZip } from '../lib/kits';
import type { Produto, Variacao } from '../types';
import Header from '../components/Header';
import ProductCard from '../components/ProductCard';
import VariacoesModal from '../components/VariacoesModal';
import CartDrawer from '../components/CartDrawer';
import AddedToCartToast from '../components/AddedToCartToast';
import FloatingWhatsApp from '../components/FloatingWhatsApp';
import Footer from '../components/Footer';
import styles from './KitLanding.module.css';

const CheckoutModal = lazy(() => import('../components/checkout/CheckoutModal'));

const BENEFICIOS = [
  { icone: '◎', titulo: 'Não molha', texto: 'Seda e piteira protegidas da água, do suor e da bebida.' },
  { icone: '▭', titulo: 'Não amassa', texto: 'Tudo reto e organizado, do bolso à mochila.' },
  { icone: '↻', titulo: 'O zip é seu', texto: 'Acabou o kit, o zip fica: documento, cartão, fone, o que quiser.' },
  { icone: '☀', titulo: 'Vai junto', texto: 'Praia, clube, piscina, show, viagem. Pega e vai.' },
];

/**
 * alphagalerie.com/kit — página de entrada do QR Code que vai nos kits
 * vendidos em bares e pontos parceiros. Apresenta a linha Kit Zip (dia a dia),
 * oferece a recompra pelo site e leva para a linha Case Alpha e para a loja.
 */
export default function KitLanding() {
  useVisita({ pagina: 'kit', origemPadrao: 'QR Kit' });

  const { data: kits = [], isLoading } = useKits();
  const { adicionar, adicionarVariacao } = useCarrinhoActions();
  const [variacoesTarget, setVariacoesTarget] = useState<Produto | null>(null);
  const [cartOpen, setCartOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);

  const kitsZip = kits.filter(ehKitZip);
  const kitsCase = kits.filter((k) => !ehKitZip(k));
  const fotoCapa = kitsZip[0]?.imagem_url ?? '/kits/kit-zip-alpha-pay-pay.jpg';

  useEffect(() => {
    const anterior = document.title;
    document.title = 'Kit Zip Alpha — seu kit do dia a dia | ALPHA GALERIE';
    return () => { document.title = anterior; };
  }, []);

  function handleSelectVariacao(produto: Produto, variacao: Variacao) {
    adicionarVariacao(produto, variacao);
    setVariacoesTarget(null);
  }

  function renderCards(lista: Produto[]) {
    return lista.map((kit) => (
      <ProductCard
        key={kit.id}
        produto={kit}
        onAddToCart={adicionar}
        onOpenVariacoes={setVariacoesTarget}
        hideDestaqueBadge
      />
    ));
  }

  return (
    <>
      <Header onOpenCart={() => setCartOpen(true)} />

      <main id="main-content" className={styles.page}>
        <section className={styles.hero}>
          <div className={styles.heroTexto}>
            <p className={styles.eyebrow}>✦ Exclusivo Alpha Galerie</p>
            <h1 className={styles.titulo}>
              Seu kit do <em>dia a dia</em>, no zip.
            </h1>
            <p className={styles.lead}>
              Não é só a seda, não é só a piteira. É o kit pronto, organizado e protegido
              num zip Alpha que fica com você depois.
            </p>
            <div className={styles.ctas}>
              <a href="#kits-zip" className={styles.ctaPrimario}>Ver os kits</a>
              <Link to="/" className={styles.ctaSecundario}>Conhecer a loja</Link>
            </div>
          </div>
          <div className={styles.heroFoto}>
            <img src={fotoCapa} alt="Kit Zip Alpha: sedas e piteira no zip transparente Alpha Galerie" />
          </div>
        </section>

        <section className={styles.beneficios} aria-label="Por que o kit no zip">
          {BENEFICIOS.map((b) => (
            <div key={b.titulo} className={styles.beneficio}>
              <span className={styles.beneficioIcone} aria-hidden="true">{b.icone}</span>
              <strong>{b.titulo}</strong>
              <span>{b.texto}</span>
            </div>
          ))}
        </section>

        <section id="kits-zip" className={styles.bloco}>
          <p className={styles.eyebrow}>Linha Kit Zip</p>
          <h2 className={styles.subtitulo}>Gostou? <em>Leva outro</em> pelo site.</h2>
          <p className={styles.texto}>
            Mais em conta do que comprar cada item separado. Entrega rápida ou retirada na loja.
          </p>
          {isLoading ? (
            <p className={styles.texto}>Carregando os kits…</p>
          ) : kitsZip.length > 0 ? (
            <div className={`products-grid-responsive ${styles.grid}`}>{renderCards(kitsZip)}</div>
          ) : (
            <p className={styles.texto}>Novos kits chegando. Enquanto isso, veja a linha Case Alpha abaixo.</p>
          )}
        </section>

        {kitsCase.length > 0 && (
          <section className={`${styles.bloco} ${styles.blocoCase}`}>
            <p className={styles.eyebrow}>Linha Case Alpha</p>
            <h2 className={styles.subtitulo}>Quer o <em>completo</em>?</h2>
            <p className={styles.texto}>
              O Case Alpha vem com tudo: tabaco, sedas, piteira, tesoura e acessórios num case
              rígido. Para quem quer o setup inteiro.
            </p>
            <div className={`products-grid-responsive ${styles.grid}`}>{renderCards(kitsCase)}</div>
          </section>
        )}

        <section className={styles.fecho}>
          <h2 className={styles.subtitulo}>A Alpha Galerie é <em>muito mais</em>.</h2>
          <p className={styles.texto}>
            Sedas, piteiras, tabacos, charutos, essências e headshop selecionados, com clube de
            pontos que vira desconto.
          </p>
          <Link to="/" className={styles.ctaPrimario}>Conhecer a loja completa</Link>
        </section>
      </main>

      <Footer />

      <VariacoesModal
        produto={variacoesTarget}
        onClose={() => setVariacoesTarget(null)}
        onSelect={handleSelectVariacao}
      />

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

      <FloatingWhatsApp />
      <AddedToCartToast onOpenCart={() => setCartOpen(true)} />
    </>
  );
}
