import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import Header from '../components/Header';
import CartDrawer from '../components/CartDrawer';
import AddedToCartToast from '../components/AddedToCartToast';
import Footer from '../components/Footer';
import { useZipKits } from '../hooks/useKits';
import { useCarrinhoActions } from '../hooks/useCarrinhoActions';
import { useVisita } from '../hooks/useVisita';
import { getPrecoInfo } from '../lib/preco';
import { entregaAgora, NOTURNA_ACRESCIMO, PEX_CORTE_TEXTO, ROTA_CORTE_TEXTO, ROTA_SAIDA_HORA, ROTA_VALOR } from '../lib/frete';
import type { Produto } from '../types';
import styles from './ZipAlpha.module.css';

const CheckoutModal = lazy(() => import('../components/checkout/CheckoutModal'));
const WHATSAPP_NUMBER = import.meta.env.VITE_WHATSAPP_NUMBER as string;

function linkWhatsApp(texto: string): string {
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(texto)}`;
}

function brl(valor: number): string {
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

/**
 * Os kits da campanha. O preço e o botão de carrinho vêm do produto cadastrado
 * (nome igual a `produto`); sem ele ligado no banco, o pedido vai pelo WhatsApp
 * com o preço de lançamento daqui.
 */
const KITS = [
  {
    produto: 'ZIP ALPHA DUO PAY-PAY',
    nome: 'Duo',
    frase: 'O básico que salva a noite.',
    itens: ['2 sedas Pay-Pay Go Green', 'Tesoura dobrável de brinde'],
    foto: 'zip-duo',
    tema: styles.temaLima,
    preco: 21.9,
    cheio: 26,
  },
  {
    produto: 'ZIP ALPHA ESSENCIAL',
    nome: 'Essencial',
    frase: 'Duas sedas, uma piteira, zero perrengue.',
    itens: ['Seda Alpha Hemp', 'Seda Mascotte Slim', 'Piteira Papelito Mega Longa'],
    foto: 'zip-essencial',
    tema: styles.temaKraft,
    preco: 33.9,
    cheio: 41,
  },
  {
    produto: 'ZIP ALPHA PRONTO',
    nome: 'Pronto',
    frase: 'Tem até o fogo. É só abrir.',
    itens: ['Seda Alpha Hemp', 'Seda King Size Slim', 'Piteira Nowdays', 'Isqueiro BIC'],
    foto: 'zip-pronto',
    tema: styles.temaCeu,
    preco: 46.9,
    cheio: 55.9,
  },
];

const FAIXA = ['Seda', 'Piteira', 'Isqueiro', 'Zip de brinde', 'Chega hoje', 'Até de madrugada'];

function Foto({ nome, alt, eager = false, className }: { nome: string; alt: string; eager?: boolean; className?: string }) {
  return (
    <img
      src={`/kits/zip/${nome}.webp`}
      srcSet={`/kits/zip/${nome}-sm.webp 640w, /kits/zip/${nome}.webp 1200w`}
      sizes="(max-width: 860px) 92vw, 50vw"
      alt={alt}
      className={className}
      loading={eager ? 'eager' : 'lazy'}
      decoding="async"
      fetchPriority={eager ? 'high' : 'auto'}
    />
  );
}

/** Revela os blocos marcados com data-reveal quando entram na tela. */
function useReveal() {
  useEffect(() => {
    const els = document.querySelectorAll<HTMLElement>('[data-reveal]');
    if (!('IntersectionObserver' in window)) {
      els.forEach((el) => el.classList.add(styles.visivel));
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            e.target.classList.add(styles.visivel);
            io.unobserve(e.target);
          }
        }
      },
      { threshold: 0.18 },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);
}

/** Relógio de São Paulo + qual entrega vale agora. Atualiza a cada 30s. */
function DaTempo() {
  const [agora, setAgora] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setAgora(new Date()), 30_000);
    return () => clearInterval(id);
  }, []);
  const hora = agora.toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit' });
  const e = entregaAgora(agora);
  const faltam = e.faltam === null ? null : e.faltam >= 60 ? `${Math.floor(e.faltam / 60)}h${String(e.faltam % 60).padStart(2, '0')}` : `${e.faltam} min`;

  return (
    <div className={styles.relogio}>
      <p className={styles.relogioAgora}>Agora são</p>
      <p className={styles.relogioHora}>{hora}</p>
      <p className={styles.relogioTitulo}>{e.titulo}.</p>
      <p className={styles.relogioDetalhe}>
        {faltam ? <>Peça nos próximos <strong>{faltam}</strong> · </> : null}
        {e.detalhe}
      </p>
    </div>
  );
}

/** Página da campanha do Zip Alpha: alphagalerie.com/zip (o QR code do saquinho aponta pra cá). */
export default function ZipAlpha() {
  const [cartOpen, setCartOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const { data: cadastrados = [] } = useZipKits();
  const { adicionar } = useCarrinhoActions();
  const heroRef = useRef<HTMLElement>(null);
  const barraRef = useRef<HTMLAnchorElement>(null);

  useVisita();
  useReveal();

  useEffect(() => {
    const anterior = document.title;
    document.title = 'Zip Alpha — acabou a seda? Chama a Alpha. | ALPHA GALERIE';
    // Fonte de pôster só nesta página, para o resto do site não pagar o peso.
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://fonts.googleapis.com/css2?family=Anton&display=swap';
    document.head.appendChild(link);
    return () => {
      document.title = anterior;
      link.remove();
    };
  }, []);

  // O zip do hero gira e sobe de leve com a rolagem (só transform: não pesa),
  // e a barra "Quero meu Zip" do celular só aparece depois do hero.
  useEffect(() => {
    const animar = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let raf = 0;
    function onScroll() {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const y = window.scrollY;
        if (animar) heroRef.current?.style.setProperty('--scroll', String(Math.min(y, 900) / 900));
        barraRef.current?.classList.toggle(styles.barraVisivel, y > 650);
      });
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      cancelAnimationFrame(raf);
    };
  }, []);

  function produtoDo(nome: string): Produto | undefined {
    return cadastrados.find((p) => p.nome.toUpperCase() === nome);
  }

  return (
    <div className={styles.page}>
      <Header onOpenCart={() => setCartOpen(true)} />

      <main id="main-content">
        {/* 1. Hero */}
        <section className={styles.hero} ref={heroRef}>
          <span className={styles.heroFundo} aria-hidden="true">ZIP</span>
          <div className={styles.heroTexto}>
            <p className={styles.selo}>Novo · só na Alpha</p>
            <h1 className={styles.heroTitulo}>
              Acabou a seda?
              <span>Chama a Alpha.</span>
            </h1>
            <p className={styles.heroLead}>
              Tudo pro rolê num zip com a nossa marca. Você pede, a gente leva. E o zip fica com você.
            </p>
            <div className={styles.ctas}>
              <a href="#kits" className={styles.btn}>Quero meu Zip</a>
              <a href="#da-tempo" className={styles.btnGhost}>Dá tempo de chegar?</a>
            </div>
          </div>
          <div className={styles.heroProduto}>
            <Foto nome="zip-pronto" alt="Zip Alpha Pronto: duas sedas, piteira Nowdays e isqueiro BIC num zip transparente" eager className={styles.heroFoto} />
          </div>
        </section>

        {/* 2. Faixa */}
        <div className={styles.faixa} aria-hidden="true">
          <div className={styles.faixaTrilho}>
            {[...FAIXA, ...FAIXA, ...FAIXA].map((t, i) => (
              <span key={i}>{t} <b>✦</b></span>
            ))}
          </div>
        </div>

        {/* 3. A história */}
        <section className={styles.historia}>
          <p data-reveal className={styles.reveal}><span className={styles.hora}>23h47.</span> O show começa em vinte minutos.</p>
          <p data-reveal className={styles.reveal}>A seda acabou. A tabacaria fechou.</p>
          <p data-reveal className={`${styles.reveal} ${styles.historiaFinal}`}>Calma. <em>Chama a Alpha.</em></p>
        </section>

        {/* 4. O que vem */}
        <section className={styles.dentro}>
          <div data-reveal className={`${styles.reveal} ${styles.dentroFoto}`}>
            <Foto nome="zip-essencial" alt="Zip Alpha Essencial aberto: seda Alpha Hemp, seda Mascotte e piteira Papelito" />
          </div>
          <div className={styles.dentroTexto}>
            <p className={styles.selo}>O que vem no zip</p>
            <h2 className={styles.h2}>Não é um kit.<br />É o rolê resolvido.</h2>
            <ul className={styles.chips}>
              <li>Seda</li>
              <li>Piteira</li>
              <li>Isqueiro</li>
              <li>Zip reutilizável</li>
            </ul>
            <p className={styles.texto}>
              A gente escolhe o que combina, monta, fecha no zip e manda. Sai mais em conta do que comprar cada item
              separado, e ninguém mais no Brasil entrega assim.
            </p>
          </div>
        </section>

        {/* 5. O zip é seu */}
        <section className={styles.seu}>
          <div className={styles.seuTexto} data-reveal>
            <p className={styles.seloEscuro}>O zip é seu</p>
            <h2 className={styles.seuTitulo}>Guarde<br />o rolê.</h2>
            <p>Acabou o kit? O zip continua. Ele é transparente, resistente e vai com você pra todo lado.</p>
            <ul className={styles.usos}>
              <li><strong>01</strong> O kit da próxima</li>
              <li><strong>02</strong> A chave e o fone</li>
              <li><strong>03</strong> O ingresso do show</li>
              <li><strong>04</strong> As lembranças da noite</li>
            </ul>
          </div>
          <div className={styles.seuFoto} data-reveal>
            <Foto nome="zip-duo" alt="Zip Alpha Duo: duas sedas Pay-Pay e tesoura dobrável" />
          </div>
        </section>

        {/* 6. Dá tempo de chegar? */}
        <section id="da-tempo" className={styles.tempo}>
          <h2 className={styles.h2}>Dá tempo<br />de chegar?</h2>
          <DaTempo />
          <ol className={styles.linha}>
            <li><strong>até {PEX_CORTE_TEXTO}</strong><span>Chega hoje · Entrega Programada · R$ 15</span></li>
            <li><strong>até {ROTA_CORTE_TEXTO}</strong><span>Sai às {ROTA_SAIDA_HORA}h · Alphaville e Barueri · R$ {ROTA_VALOR}</span></li>
            <li><strong>até 22h</strong><span>Motoboy na hora · preço da região</span></li>
            <li><strong>depois das 22h</strong><span>Expressa noturna · moto ou carro · + R$ {NOTURNA_ACRESCIMO}</span></li>
          </ol>
        </section>

        {/* 7. Kits */}
        <section id="kits" className={styles.kits}>
          <div className={styles.kitsTopo}>
            <p className={styles.selo}>Escolhe o seu</p>
            <h2 className={styles.h2}>Três zips.<br />Um pra cada rolê.</h2>
          </div>
          <div className={styles.kitsTrilho}>
            {KITS.map((k) => {
              const produto = produtoDo(k.produto);
              const preco = produto ? getPrecoInfo(produto).precoFinal : k.preco;
              const cheio = produto ? Number(produto.preco) : k.cheio;
              return (
                <article key={k.produto} className={`${styles.kit} ${k.tema}`}>
                  <div className={styles.kitFoto}>
                    <Foto nome={k.foto} alt={`Zip Alpha ${k.nome}`} />
                  </div>
                  <div className={styles.kitInfo}>
                    <h3 className={styles.kitNome}>Zip {k.nome}</h3>
                    <p className={styles.kitFrase}>{k.frase}</p>
                    <ul className={styles.kitItens}>
                      {k.itens.map((i) => <li key={i}>{i}</li>)}
                      <li>+ o zip, que fica com você</li>
                    </ul>
                    <p className={styles.kitPreco}>
                      {cheio > preco && <s>{brl(cheio)}</s>}
                      <strong>{brl(preco)}</strong>
                    </p>
                    {produto && (produto.estoque ?? 0) > 0 ? (
                      <button type="button" className={styles.kitBtn} onClick={() => adicionar(produto)}>
                        Quero esse
                      </button>
                    ) : (
                      <a className={styles.kitBtn} href={linkWhatsApp(`Oi! Quero o Zip Alpha ${k.nome} 🔥`)} target="_blank" rel="noopener noreferrer">
                        Quero esse
                      </a>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        {/* 8. Fechamento */}
        <section className={styles.final}>
          <h2 className={styles.finalTitulo} data-reveal>O rolê<br />não espera.</h2>
          <a href="#kits" className={styles.btn}>Quero meu Zip</a>
          <p className={styles.aviso}>
            Venda proibida para menores de 18 anos. <Link to="/">Ver a loja completa →</Link>
          </p>
        </section>
      </main>

      <a href="#kits" ref={barraRef} className={styles.barraMobile}>Quero meu Zip · a partir de {brl(KITS[0].preco)}</a>

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
      <AddedToCartToast onOpenCart={() => setCartOpen(true)} />
    </div>
  );
}
