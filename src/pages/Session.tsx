import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import Header from '../components/Header';
import CartDrawer from '../components/CartDrawer';
import AddedToCartToast from '../components/AddedToCartToast';
import Footer from '../components/Footer';
import CompraRapida, { type KitCompraRapida } from '../components/CompraRapida';
import { useSessionKits } from '../hooks/useKits';
import { useVisita } from '../hooks/useVisita';
import { getPrecoInfo } from '../lib/preco';
import { entregaAgora, NOTURNA_ACRESCIMO, PEX_CORTE_TEXTO, ROTA_CORTE_TEXTO, ROTA_SAIDA_HORA, ROTA_VALOR } from '../lib/frete';
import styles from './Session.module.css';

const CheckoutModal = lazy(() => import('../components/checkout/CheckoutModal'));

/** Nome da linha. Trocar aqui troca na página toda. */
const LINHA = 'Session';

function brl(valor: number): string {
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

/**
 * As edições da linha. Preço vem do produto cadastrado (nome igual a
 * `produto`); sem ele no banco, vale o preço de lançamento daqui.
 */
const EDICOES = [
  {
    produto: 'SESSION 01 LIMA',
    numero: 'Nº01',
    cor: 'Lima',
    frase: 'O básico que salva a noite.',
    itens: ['2 sedas Pay-Pay Go Green', 'Tesoura dobrável de brinde'],
    foto: 'session-01',
    tema: styles.temaLima,
    preco: 21.9,
    cheio: 26,
  },
  {
    produto: 'SESSION 02 KRAFT',
    numero: 'Nº02',
    cor: 'Kraft',
    frase: 'Duas sedas, uma piteira, zero perrengue.',
    itens: ['Seda Alpha Hemp', 'Seda Mascotte Slim', 'Piteira Papelito Mega Longa'],
    foto: 'session-02',
    tema: styles.temaKraft,
    preco: 33.9,
    cheio: 41,
  },
  {
    produto: 'SESSION 03 CEU',
    numero: 'Nº03',
    cor: 'Céu',
    frase: 'Completo. Tem até o fogo.',
    itens: ['Seda Alpha Hemp', 'Seda King Size Slim', 'Piteira Nowdays', 'Isqueiro BIC'],
    foto: 'session-03',
    tema: styles.temaCeu,
    preco: 46.9,
    cheio: 55.9,
  },
];

const FAIXA = ['Kits exclusivos', 'Seda', 'Piteira', 'Isqueiro', 'Embalagem exclusiva', 'Paga no Pix', 'Chega hoje', 'Até de madrugada'];

function Foto({ nome, alt, eager = false, className }: { nome: string; alt: string; eager?: boolean; className?: string }) {
  return (
    <img
      src={`/kits/session/${nome}.webp`}
      srcSet={`/kits/session/${nome}-sm.webp 640w, /kits/session/${nome}.webp 1200w`}
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

/**
 * Página da linha Session, os kits exclusivos da Alpha Galerie para o rolê:
 * alphagalerie.com/session (e /zip, para onde aponta o QR code da embalagem).
 * A compra é rápida: "Quero essa" abre o Pix e o pedido vai pelo WhatsApp.
 */
export default function Session() {
  const [cartOpen, setCartOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [comprando, setComprando] = useState<KitCompraRapida | null>(null);
  const { data: cadastrados = [] } = useSessionKits();
  const heroRef = useRef<HTMLElement>(null);
  const barraRef = useRef<HTMLAnchorElement>(null);

  useVisita();
  useReveal();

  useEffect(() => {
    const anterior = document.title;
    document.title = `${LINHA} by Alpha Galerie · kits exclusivos pro rolê`;
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

  // O kit do hero gira e sobe de leve com a rolagem (só transform: não pesa),
  // e a barra de compra do celular só aparece depois do hero.
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

  const edicoes = EDICOES.map((e) => {
    const produto = cadastrados.find((p) => p.nome.toUpperCase() === e.produto);
    return {
      ...e,
      preco: produto ? getPrecoInfo(produto).precoFinal : e.preco,
      cheio: produto ? Number(produto.preco) : e.cheio,
      esgotado: produto ? (produto.estoque ?? 0) <= 0 : false,
    };
  });

  return (
    <div className={styles.page}>
      <Header onOpenCart={() => setCartOpen(true)} />

      <main id="main-content">
        {/* 1. Hero */}
        <section className={styles.hero} ref={heroRef}>
          <span className={styles.heroFundo} aria-hidden="true">{LINHA}</span>
          <div className={styles.heroTexto}>
            <p className={styles.selo}>Nova linha · {LINHA}</p>
            <h1 className={styles.heroTitulo}>
              Acabou a seda?
              <span>Chama a Alpha.</span>
            </h1>
            <p className={styles.heroLead}>
              {LINHA} é a nossa linha de kits exclusivos pro rolê. Tudo montado, fechado numa embalagem exclusiva e
              entregue onde você estiver. Paga no Pix, chega hoje.
            </p>
            <div className={styles.ctas}>
              <a href="#edicoes" className={styles.btn}>Ver as edições</a>
              <a href="#da-tempo" className={styles.btnGhost}>Dá tempo de chegar?</a>
            </div>
          </div>
          <div className={styles.heroProduto}>
            <Foto nome="session-03" alt={`${LINHA} Nº03 Céu: duas sedas, piteira Nowdays e isqueiro BIC na embalagem exclusiva`} eager className={styles.heroFoto} />
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
            <Foto nome="session-02" alt={`${LINHA} Nº02 Kraft: seda Alpha Hemp, seda Mascotte e piteira Papelito`} />
          </div>
          <div className={styles.dentroTexto}>
            <p className={styles.selo}>Kit exclusivo</p>
            <h2 className={styles.h2}>Não é um kit.<br />É o rolê resolvido.</h2>
            <ul className={styles.chips}>
              <li>Seda</li>
              <li>Piteira</li>
              <li>Isqueiro</li>
              <li>Embalagem exclusiva</li>
            </ul>
            <p className={styles.texto}>
              Cada edição é montada por quem entende: as sedas certas, a piteira que combina, e o que mais o rolê pedir.
              Sai mais em conta do que comprar cada item separado.
            </p>
          </div>
        </section>

        {/* 5. Embalagem */}
        <section className={styles.seu}>
          <div className={styles.seuTexto} data-reveal>
            <p className={styles.seloEscuro}>Embalagem exclusiva</p>
            <h2 className={styles.seuTitulo}>Guarde<br />o rolê.</h2>
            <p>
              Toda {LINHA} vem numa embalagem transparente com a marca Alpha Galerie. O kit acaba, ela continua com você.
            </p>
            <ul className={styles.usos}>
              <li><strong>01</strong> A próxima edição</li>
              <li><strong>02</strong> A chave e o fone</li>
              <li><strong>03</strong> O ingresso do show</li>
              <li><strong>04</strong> As lembranças da noite</li>
            </ul>
          </div>
          <div className={styles.seuFoto} data-reveal>
            <Foto nome="session-01" alt={`${LINHA} Nº01 Lima: duas sedas Pay-Pay e tesoura dobrável`} />
          </div>
        </section>

        {/* 6. Edições */}
        <section id="edicoes" className={styles.kits}>
          <div className={styles.kitsTopo}>
            <p className={styles.selo}>As edições</p>
            <h2 className={styles.h2}>Escolhe a sua<br />{LINHA}.</h2>
            <ol className={styles.comoCompra}>
              <li><b>1</b> Escolhe</li>
              <li><b>2</b> Paga no Pix</li>
              <li><b>3</b> Manda o endereço no WhatsApp</li>
            </ol>
          </div>
          <div className={styles.kitsTrilho}>
            {edicoes.map((k) => (
              <article key={k.produto} className={`${styles.kit} ${k.tema}`}>
                <div className={styles.kitFoto}>
                  <Foto nome={k.foto} alt={`${LINHA} ${k.numero} ${k.cor}`} />
                </div>
                <div className={styles.kitInfo}>
                  <p className={styles.kitLinha}>{LINHA} {k.numero}</p>
                  <h3 className={styles.kitNome}>{k.cor}</h3>
                  <p className={styles.kitFrase}>{k.frase}</p>
                  <ul className={styles.kitItens}>
                    {k.itens.map((i) => <li key={i}>{i}</li>)}
                    <li>Acompanha embalagem exclusiva</li>
                  </ul>
                  <p className={styles.kitPreco}>
                    {k.cheio > k.preco && <s>{brl(k.cheio)}</s>}
                    <strong>{brl(k.preco)}</strong>
                  </p>
                  <button
                    type="button"
                    className={styles.kitBtn}
                    disabled={k.esgotado}
                    onClick={() => setComprando({
                      nome: `${LINHA} ${k.numero} ${k.cor}`,
                      itens: k.itens,
                      foto: `/kits/session/${k.foto}-sm.webp`,
                      preco: k.preco,
                    })}
                  >
                    {k.esgotado ? 'Esgotada' : 'Quero essa'}
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>

        {/* 7. Dá tempo de chegar? */}
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

        {/* 8. Fechamento */}
        <section className={styles.final}>
          <h2 className={styles.finalTitulo} data-reveal>O rolê<br />não espera.</h2>
          <a href="#edicoes" className={styles.btn}>Escolher minha {LINHA}</a>
          <p className={styles.aviso}>
            Venda proibida para menores de 18 anos. <Link to="/">Ver a loja completa →</Link>
          </p>
        </section>
      </main>

      <a href="#edicoes" ref={barraRef} className={styles.barraMobile}>
        Quero minha {LINHA} · a partir de {brl(Math.min(...edicoes.map((e) => e.preco)))}
      </a>

      <Footer />

      {comprando && <CompraRapida kit={comprando} onClose={() => setComprando(null)} />}

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
