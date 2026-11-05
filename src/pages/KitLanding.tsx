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
    titulo: 'Criado por quem usa',
    texto: 'Desenvolvido a partir da experiência real de quem vive a cultura, para quem exige qualidade em cada detalhe.',
  },
  {
    icone: '✦',
    titulo: 'Inédito no mercado',
    texto: 'Um kit que não existia até agora. Exclusivo Alpha Galerie, você não encontra em nenhuma outra loja.',
  },
  {
    icone: '▭',
    titulo: 'Pronto para sair com você',
    texto: 'Seda e piteira de qualidade sempre juntas, protegidas e organizadas no estojo. É só pegar e ir.',
  },
  {
    icone: '◎',
    titulo: 'Assinatura Alpha Galerie',
    texto: 'Estojo com design próprio, feito para durar e para ser notado onde você estiver.',
  },
];

/**
 * alphagalerie.com/kit — página de entrada do QR Code que vai nos kits
 * vendidos em bares e pontos parceiros. Apresenta os kits do dia a dia (no
 * estojo exclusivo Alpha), vende pelo site e leva para a linha Case Alpha e
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
  const fotoCapa = kitsDiaADia[0]?.imagem_url ?? '/kits/kit-pay-pay-alpha.jpg';

  useEffect(() => {
    const anterior = document.title;
    document.title = 'Kits Alpha — pensados para quem entende | ALPHA GALERIE';
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
              Pensado, desenvolvido e exclusivo para quem <em>realmente entende</em>.
            </h1>
            <p className={styles.lead}>
              Não é só a seda. Não é só a piteira. É o conjunto: um kit criado para o seu dia a
              dia, completo e pronto para sair com você, no estojo exclusivo Alpha Galerie.
            </p>
            <div className={styles.ctas}>
              <a href="#kits" className={styles.ctaPrimario}>Ver os kits</a>
              <Link to="/" className={styles.ctaSecundario}>Conhecer a loja</Link>
            </div>
          </div>
          <div className={styles.heroFoto}>
            <img src={fotoCapa} alt="Kit Alpha: sedas e piteira no estojo exclusivo Alpha Galerie" />
          </div>
        </section>

        <section className={styles.beneficios} aria-label="Por que o Kit Alpha">
          {BENEFICIOS.map((b) => (
            <div key={b.titulo} className={styles.beneficio}>
              <span className={styles.beneficioIcone} aria-hidden="true">{b.icone}</span>
              <strong>{b.titulo}</strong>
              <span>{b.texto}</span>
            </div>
          ))}
        </section>

        <section id="kits" className={styles.bloco}>
          <p className={styles.eyebrow}>Kits do dia a dia</p>
          <h2 className={styles.subtitulo}>Gostou? <em>Garanta o seu</em> pelo site.</h2>
          <p className={styles.texto}>
            Compra 100% online, em poucos cliques, e entrega no seu endereço.
          </p>
          {isLoading ? (
            <p className={styles.texto}>Carregando os kits…</p>
          ) : kitsDiaADia.length > 0 ? (
            <div className={`products-grid-responsive ${styles.grid}`}>{renderCards(kitsDiaADia)}</div>
          ) : (
            <p className={styles.texto}>Novos kits chegando. Enquanto isso, veja a linha Case Alpha abaixo.</p>
          )}
        </section>

        {kitsCase.length > 0 && (
          <section className={`${styles.bloco} ${styles.blocoCase}`}>
            <p className={styles.eyebrow}>Linha Case Alpha</p>
            <h2 className={styles.subtitulo}>Quer o <em>setup completo</em>?</h2>
            <p className={styles.texto}>
              O Case Alpha leva o mesmo cuidado a outro nível: tabaco, sedas, piteira, tesoura e
              acessórios num case rígido, montado peça por peça.
            </p>
            <div className={`products-grid-responsive ${styles.grid}`}>{renderCards(kitsCase)}</div>
          </section>
        )}

        <section className={styles.fecho}>
          <h2 className={styles.subtitulo}>A Alpha Galerie é <em>muito mais</em>.</h2>
          <p className={styles.texto}>
            Sedas, piteiras, tabacos, charutos, essências e headshop com curadoria, comprados 100%
            online, com clube de pontos que vira desconto.
          </p>
          <Link to="/" className={styles.ctaPrimario}>Conhecer a loja completa</Link>
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
