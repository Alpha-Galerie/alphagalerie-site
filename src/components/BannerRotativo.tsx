import { useEffect, useMemo, useRef, useState } from 'react';
import { useMarcas } from '../hooks/useMarcas';
import styles from './BannerRotativo.module.css';

const WHATSAPP_NUMBER = import.meta.env.VITE_WHATSAPP_NUMBER as string;
const WA_URL = `https://wa.me/${WHATSAPP_NUMBER}?text=Ol%C3%A1!%20Vim%20pelo%20site%20e%20quero%20uma%20indica%C3%A7%C3%A3o.`;

const INTERVALO = 6500;
const DISTANCIA_SWIPE = 45;

interface Slide {
  id: string;
  tema: string;
  eyebrow: string;
  titulo: React.ReactNode;
  texto: string;
  cta: { label: string; href: string; externo?: boolean };
}

export default function BannerRotativo() {
  const { marcas } = useMarcas(6);
  const [ativo, setAtivo] = useState(0);
  const [pausado, setPausado] = useState(false);
  const toqueRef = useRef<number | null>(null);

  const [reduzMovimento] = useState(
    () => globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
  );

  const slides = useMemo<Slide[]>(() => {
    const destaque = marcas.slice(0, 3);
    const textoMarcas = destaque.length
      ? `${destaque.join(' · ')}${marcas.length > 3 ? ' e muito mais' : ''}. Originais, sempre.`
      : 'As marcas que você procura, escolhidas uma a uma. Originais, sempre.';

    return [
      {
        id: 'marcas',
        tema: styles.temaMarcas,
        eyebrow: 'Marcas',
        titulo: (
          <>
            As melhores marcas,
            <br />
            <em>num só lugar</em>.
          </>
        ),
        texto: textoMarcas,
        cta: { label: 'Ver a vitrine', href: '#produtos' },
      },
      {
        id: 'curadoria',
        tema: styles.temaCuradoria,
        eyebrow: 'Curadoria',
        titulo: (
          <>
            Da seda artesanal
            <br />
            ao <em>charuto raro</em>.
          </>
        ),
        texto: 'Mais de 500 produtos escolhidos um a um — sem encher prateleira.',
        cta: { label: 'Explorar produtos', href: '#produtos' },
      },
      {
        id: 'atendimento',
        tema: styles.temaAtendimento,
        eyebrow: 'Atendimento',
        titulo: (
          <>
            Fala direto
            <br />
            com quem <em>entende</em>.
          </>
        ),
        texto: 'Dúvida de produto, pedido especial ou prazo: chama no WhatsApp.',
        cta: { label: 'Chamar no WhatsApp', href: WA_URL, externo: true },
      },
    ];
  }, [marcas]);

  useEffect(() => {
    if (pausado || reduzMovimento) return;
    const id = setInterval(
      () => setAtivo((i) => (i + 1) % slides.length),
      INTERVALO
    );
    return () => clearInterval(id);
  }, [pausado, reduzMovimento, slides.length]);

  function irPara(indice: number) {
    setAtivo((indice + slides.length) % slides.length);
  }

  function aoTocar(e: React.TouchEvent) {
    toqueRef.current = e.changedTouches[0]?.clientX ?? null;
  }

  function aoSoltar(e: React.TouchEvent) {
    const inicio = toqueRef.current;
    toqueRef.current = null;
    if (inicio === null) return;
    const delta = (e.changedTouches[0]?.clientX ?? inicio) - inicio;
    if (Math.abs(delta) < DISTANCIA_SWIPE) return;
    irPara(ativo + (delta < 0 ? 1 : -1));
  }

  return (
    <section
      className={styles.banner}
      aria-roledescription="carrossel"
      aria-label="Destaques da Alpha Galerie"
      onMouseEnter={() => setPausado(true)}
      onMouseLeave={() => setPausado(false)}
      onFocusCapture={() => setPausado(true)}
      onBlurCapture={() => setPausado(false)}
      onTouchStart={aoTocar}
      onTouchEnd={aoSoltar}
    >
      <div className={styles.palco}>
        {slides.map((slide, i) => {
          const visivel = i === ativo;
          return (
            <article
              key={slide.id}
              className={`${styles.slide} ${slide.tema} ${visivel ? styles.ativo : ''}`}
              aria-hidden={!visivel}
              aria-roledescription="slide"
              aria-label={`${i + 1} de ${slides.length}`}
            >
              <span className={styles.selo} aria-hidden="true" />

              <div className={styles.conteudo}>
                <p className={styles.eyebrow}>{slide.eyebrow}</p>
                <h2 className={styles.titulo}>{slide.titulo}</h2>
                <p className={styles.texto}>{slide.texto}</p>
                <a
                  className={styles.cta}
                  href={slide.cta.href}
                  tabIndex={visivel ? undefined : -1}
                  {...(slide.cta.externo
                    ? { target: '_blank', rel: 'noopener noreferrer' }
                    : {})}
                >
                  {slide.cta.label}
                  <span aria-hidden="true">→</span>
                </a>
              </div>
            </article>
          );
        })}
      </div>

      <button
        type="button"
        className={`${styles.seta} ${styles.setaAnterior}`}
        onClick={() => irPara(ativo - 1)}
        aria-label="Destaque anterior"
      >
        ‹
      </button>
      <button
        type="button"
        className={`${styles.seta} ${styles.setaProximo}`}
        onClick={() => irPara(ativo + 1)}
        aria-label="Próximo destaque"
      >
        ›
      </button>

      <div className={styles.pontos} role="tablist" aria-label="Escolher destaque">
        {slides.map((slide, i) => (
          <button
            key={slide.id}
            type="button"
            role="tab"
            className={`${styles.ponto} ${i === ativo ? styles.pontoAtivo : ''}`}
            aria-selected={i === ativo}
            aria-label={`Destaque ${i + 1}: ${slide.eyebrow}`}
            onClick={() => irPara(i)}
          />
        ))}
      </div>
    </section>
  );
}
