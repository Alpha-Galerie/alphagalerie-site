import { lazy, Suspense, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useKits } from '../hooks/useKits';
import { useVisita } from '../hooks/useVisita';
import { useCarrinhoActions } from '../hooks/useCarrinhoActions';
import { ehKitCase } from '../lib/kits';
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
  {
    icone: '◇',
    titulo: 'De quem vive a cultura',
    texto: 'Cada kit nasceu da experiência de quem usa. Nada genérico: só o que faz diferença na hora.',
  },
  {
    icone: '▭',
    titulo: 'Nunca mais na mão',
    texto: 'O essencial sempre junto, protegido e pronto para sair com você a qualquer momento.',
  },
  {
    icone: '✦',
    titulo: 'Único e inovador',
    texto: 'Ninguém no mercado faz um kit assim. Criado e desenvolvido pela Alpha Galerie.',
  },
  {
    icone: '◎',
    titulo: 'Assinatura Alpha Galerie',
    texto: 'Design próprio e inovador, desenvolvido para atender a real necessidade de quem usa.',
  },
];

/**
 * alphagalerie.com/kit — página de entrada do QR Code que vai nos kits
 * vendidos em bares e pontos parceiros. Apresenta os kits do dia a dia (na
 * embalagem exclusiva Alpha Galerie), vende pelo site e leva para a linha Case Alpha e
 * para a loja. Venda 100% online: o rodapé não mostra endereço da loja.
 */
export default function KitLanding() {
  useVisita({ pagina: 'kit', origemPadrao: 'QR Kit' });

  const { data: kits = [], isLoading } = useKits();
  const { adicionar, adicionarVariacao } = useCarrinhoActions();
  const [variacoesTarget, setVariacoesTarget] = useState<Produto | null>(null);
  const [cartOpen, setCartOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);

  const kitsDiaADia = kits.filter((k) => !ehKitCase(k));
  const kitsCase = kits.filter(ehKitCase);

  useEffect(() => {
    const anterior = document.title;
    document.title = 'Kits exclusivos Alpha — adquira o seu | ALPHA GALERIE';
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
          <div className={styles.heroFundo} aria-hidden="true">
            <span className={`${styles.brilho} ${styles.brilho1}`} />
            <span className={`${styles.brilho} ${styles.brilho2}`} />
            <span className={`${styles.brilho} ${styles.brilho3}`} />
            <span className={styles.selo}>ag</span>
            <span className={styles.grao} />
          </div>

          <div className={styles.heroConteudo}>
            <p className={`${styles.eyebrow} ${styles.entra}`}>✦ Kits Alpha Galerie</p>
            <h1 className={`${styles.titulo} ${styles.entra} ${styles.entra2}`}>
              Desenvolvido para <em>nunca mais te deixar na mão</em>.
            </h1>
            <ul className={`${styles.selos} ${styles.entra} ${styles.entra2}`} aria-label="Kit único, exclusivo e inovador">
              <li>Único</li>
              <li>Exclusivo</li>
              <li>Inovador</li>
            </ul>
            <p className={`${styles.lead} ${styles.entra} ${styles.entra3}`}>
              Criado por quem vive a cultura, feito para quem é da cultura. Tudo o que não pode
              faltar, com produtos selecionados. Ninguém no mercado faz um kit assim.
            </p>
            <a href="#kits" className={`${styles.ctaPrimario} ${styles.ctaBrilho} ${styles.entra} ${styles.entra4}`}>
              Escolha o seu kit
            </a>
          </div>

          <div className={styles.faixa} aria-hidden="true">
            <div className={styles.faixaTrilho}>
              {Array.from({ length: 2 }).map((_, i) => (
                <span key={i}>
                  Kit único ✦ Exclusivo ✦ Inovador ✦ Só na Alpha Galerie ✦ Compre no site e receba em casa ✦&nbsp;
                </span>
              ))}
            </div>
          </div>
        </section>

        <section id="kits" className={styles.bloco}>
          <h2 className={styles.subtitulo}>Kits Alpha <em>exclusivos</em>.</h2>
          <p className={styles.texto}>
            Escolha o seu. <strong className={styles.destaque}>Compre no site e receba em casa.</strong>
          </p>
          {isLoading ? (
            <p className={styles.texto}>Carregando os kits…</p>
          ) : kitsDiaADia.length > 0 ? (
            <div className={`products-grid-responsive ${styles.grid}`}>{renderCards(kitsDiaADia)}</div>
          ) : (
            <p className={styles.texto}>Novos kits chegando. Enquanto isso, veja a linha Case Alpha abaixo.</p>
          )}
        </section>

        <section className={styles.bloco} aria-label="Por que os Kits Alpha">
          <h2 className={styles.subtitulo}>Um kit que <em>te entende</em>.</h2>
          <p className={styles.texto}>Desenvolvido para atender a sua necessidade.</p>
          <div className={styles.beneficios}>
            {BENEFICIOS.map((b) => (
              <div key={b.titulo} className={styles.beneficio}>
                <span className={styles.beneficioIcone} aria-hidden="true">{b.icone}</span>
                <strong>{b.titulo}</strong>
                <span>{b.texto}</span>
              </div>
            ))}
          </div>
        </section>

        {kitsCase.length > 0 && (
          <section className={`${styles.bloco} ${styles.blocoCase}`}>
            <h2 className={styles.subtitulo}>Case Alpha 2.0, <em>o seu setup completo</em>.</h2>
            <p className={styles.texto}>
              Tabaco, sedas, piteira, tesoura e acessórios organizados no case rígido Alpha. Tudo
              o que você precisa, num só lugar, pronto para ir com você.
            </p>
            <div className={`products-grid-responsive ${styles.grid}`}>{renderCards(kitsCase)}</div>
          </section>
        )}

        <section className={styles.fecho}>
          <h2 className={styles.subtitulo}>Quem entende, <em>já tem o seu</em>.</h2>
          <p className={styles.texto}>
            Estoque limitado. Garanta o seu antes que acabe.
          </p>
          <a href="#kits" className={styles.ctaPrimario}>Adquira o seu agora</a>
          <p className={styles.linkLoja}>
            <Link to="/">Ou conheça a loja completa →</Link>
          </p>
        </section>
      </main>

      <Footer semEndereco />

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
