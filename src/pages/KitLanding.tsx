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
    titulo: 'Exclusivo de verdade',
    texto: 'Um kit que não existia no mercado. Você só encontra na Alpha Galerie.',
  },
  {
    icone: '◎',
    titulo: 'Assinatura Alpha Galerie',
    texto: 'Design próprio que chama atenção. Onde você abrir, alguém vai perguntar de onde é.',
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
          <p className={styles.eyebrow}>✦ Kits exclusivos Alpha Galerie</p>
          <h1 className={styles.titulo}>
            Desenvolvido para <em>nunca mais te deixar na mão</em>.
          </h1>
          <p className={styles.lead}>
            Criado por quem vive a cultura, para quem vive a cultura. Tudo o que não pode
            faltar, com produtos das melhores marcas, pra você não ter dor de cabeça. Um kit
            exclusivo.
          </p>
          <a href="#kits" className={styles.ctaPrimario}>Escolha o seu kit</a>
        </section>

        <section id="kits" className={styles.bloco}>
          <p className={styles.eyebrow}>Escolha o seu</p>
          <h2 className={styles.subtitulo}>Kits Alpha <em>exclusivos</em>.</h2>
          <p className={styles.texto}>
            Veja o que vem em cada um e escolha o seu. Compra 100% online e entrega no seu
            endereço.
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
          <p className={styles.eyebrow}>Por que é diferente</p>
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
          <p className={styles.eyebrow}>Edição limitada</p>
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
