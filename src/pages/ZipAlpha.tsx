import { lazy, Suspense, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Header from '../components/Header';
import CartDrawer from '../components/CartDrawer';
import ProductCard from '../components/ProductCard';
import VariacoesModal from '../components/VariacoesModal';
import AddedToCartToast from '../components/AddedToCartToast';
import FloatingWhatsApp from '../components/FloatingWhatsApp';
import Footer from '../components/Footer';
import { useZipKits } from '../hooks/useKits';
import { useCarrinhoActions } from '../hooks/useCarrinhoActions';
import { useVisita } from '../hooks/useVisita';
import { NOTURNA_ACRESCIMO, PEX_CORTE_TEXTO, ROTA_CORTE_TEXTO, ROTA_SAIDA_HORA, ROTA_VALOR } from '../lib/frete';
import type { Produto, Variacao } from '../types';
import styles from './ZipAlpha.module.css';

const CheckoutModal = lazy(() => import('../components/checkout/CheckoutModal'));
const WHATSAPP_NUMBER = import.meta.env.VITE_WHATSAPP_NUMBER as string;

function linkWhatsApp(texto: string): string {
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(texto)}`;
}

// Vitrine fixa com as fotos: aparece enquanto os kits não estão ligados no
// banco, e o pedido vai pelo WhatsApp.
const VITRINE = [
  { nome: 'Zip Duo Pay-Pay', foto: '/kits/zip/zip-duo-pay-pay-2.webp', itens: '2 sedas Pay-Pay Go Green + tesoura dobrável de brinde' },
  { nome: 'Zip Essencial', foto: '/kits/zip/zip-essencial.webp', itens: 'Alpha Hemp + Mascotte Slim + piteira Papelito Mega Longa' },
  { nome: 'Zip Pronto', foto: '/kits/zip/zip-pronto.webp', itens: 'Duas sedas + piteira Nowdays + isqueiro BIC' },
];

/** Página da campanha do Zip Alpha: alphagalerie.com/zip (o QR code do saquinho aponta pra cá). */
export default function ZipAlpha() {
  const [cartOpen, setCartOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [variacoesTarget, setVariacoesTarget] = useState<Produto | null>(null);
  const { data: kits = [] } = useZipKits();
  const { adicionar, adicionarVariacao } = useCarrinhoActions();

  useVisita();

  useEffect(() => {
    const anterior = document.title;
    document.title = 'Zip Alpha — acabou a seda? Chama a Alpha | ALPHA GALERIE';
    return () => { document.title = anterior; };
  }, []);

  function handleSelectVariacao(produto: Produto, variacao: Variacao) {
    adicionarVariacao(produto, variacao);
    setVariacoesTarget(null);
  }

  return (
    <>
      <Header onOpenCart={() => setCartOpen(true)} />

      <main id="main-content" className={styles.page}>
        <section className={styles.hero}>
          <div className={styles.heroTexto}>
            <p className={styles.eyebrow}>Novo · Zip Alpha</p>
            <h1 className={styles.titulo}>
              Acabou a seda no meio do rolê? <span>Chama a Alpha.</span>
            </h1>
            <p className={styles.lead}>
              Seda, piteira e isqueiro num zip transparente com a nossa marca. Você pede, a gente leva:
              hoje à noite em Alphaville e Barueri. E o zip? <strong>Fica com você.</strong>
            </p>
            <div className={styles.ctas}>
              <a href="#kits" className={styles.ctaPrincipal}>Quero meu Zip</a>
              <a href={linkWhatsApp('Oi! Quero um Zip Alpha 🔥')} target="_blank" rel="noopener noreferrer" className={styles.ctaSecundario}>
                Pedir no WhatsApp
              </a>
            </div>
          </div>
          <img src="/kits/zip/zip-pronto.webp" alt="Zip Alpha com duas sedas, piteira Nowdays e isqueiro BIC" className={styles.heroFoto} width={1536} height={1024} />
        </section>

        <section className={styles.faixa} aria-label="Por que o Zip">
          <p>Ninguém tinha feito. <strong>A gente fez.</strong></p>
          <p>Kit pronto, preço de kit, <strong>zip de brinde.</strong></p>
          <p>Chega no mesmo dia, <strong>até de madrugada.</strong></p>
        </section>

        <section className={styles.bloco}>
          <h2 className={styles.h2}>Simples assim</h2>
          <ol className={styles.passos}>
            <li>
              <span>1</span>
              <strong>Escolhe o seu Zip</strong>
              <p>Do básico de duas sedas ao completo com isqueiro.</p>
            </li>
            <li>
              <span>2</span>
              <strong>A gente leva</strong>
              <p>Pediu até {ROTA_CORTE_TEXTO}, sai às {ROTA_SAIDA_HORA}h. Depois disso, entrega expressa.</p>
            </li>
            <li>
              <span>3</span>
              <strong>Chega pronto pro rolê</strong>
              <p>Abre o zip, separa o que precisa, e bora.</p>
            </li>
          </ol>
        </section>

        <section className={styles.zipSeu}>
          <img src="/kits/zip/zip-duo-pay-pay.webp" alt="Zip Alpha transparente com duas sedas Pay-Pay e tesoura dobrável" className={styles.zipSeuFoto} width={1774} height={887} loading="lazy" />
          <div>
            <p className={styles.eyebrow}>O zip é seu</p>
            <h2 className={styles.h2}>Guarde o rolê.</h2>
            <p>
              O zip não vai pro lixo. Guarda o kit pra próxima, a chave, o fone, o ingresso, as lembranças da noite.
              Transparente, reutilizável e com a marca de quem entende do assunto.
            </p>
          </div>
        </section>

        <section id="kits" className={styles.bloco}>
          <h2 className={styles.h2}>Escolhe o seu</h2>
          {kits.length > 0 ? (
            <div className={`products-grid-responsive ${styles.grid}`}>
              {kits.map((kit) => (
                <ProductCard key={kit.id} produto={kit} onAddToCart={adicionar} onOpenVariacoes={setVariacoesTarget} hideDestaqueBadge />
              ))}
            </div>
          ) : (
            <div className={styles.vitrine}>
              {VITRINE.map((k) => (
                <article key={k.nome} className={styles.card}>
                  <img src={k.foto} alt={k.nome} loading="lazy" width={1536} height={1024} />
                  <div className={styles.cardTexto}>
                    <h3>{k.nome}</h3>
                    <p>{k.itens}</p>
                    <a href={linkWhatsApp(`Oi! Quero o ${k.nome} 🔥`)} target="_blank" rel="noopener noreferrer" className={styles.ctaPrincipal}>
                      Pedir no WhatsApp
                    </a>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <section className={styles.bloco}>
          <h2 className={styles.h2}>Quando chega</h2>
          <div className={styles.horarios}>
            <div><strong>Pediu até {PEX_CORTE_TEXTO}</strong><p>Entrega Programada · chega hoje · R$ 15</p></div>
            <div><strong>Pediu até {ROTA_CORTE_TEXTO}</strong><p>Rota das {ROTA_SAIDA_HORA}h · Alphaville e Barueri · R$ {ROTA_VALOR}</p></div>
            <div><strong>Até 22h</strong><p>Motoboy na hora · preço da sua região</p></div>
            <div><strong>Depois das 22h</strong><p>Expressa noturna · moto ou carro · + R$ {NOTURNA_ACRESCIMO}</p></div>
          </div>
        </section>

        <p className={styles.aviso}>
          Venda proibida para menores de 18 anos. <Link to="/">Ver a loja completa →</Link>
        </p>
      </main>

      <Footer />

      <VariacoesModal produto={variacoesTarget} onClose={() => setVariacoesTarget(null)} onSelect={handleSelectVariacao} />
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
