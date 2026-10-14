import heroArte from '../assets/banner-raw.jpg';
import { useClubeRegras } from '../hooks/useClube';
import { percentualDeVolta } from '../lib/clube';
import { useState } from 'react';
import { buscarNaVitrine } from '../lib/busca';
import { PEX_CORTE_TEXTO } from '../lib/frete';
import styles from './HeroSection.module.css';

const WHATSAPP_NUMBER = import.meta.env.VITE_WHATSAPP_NUMBER as string;
const WA_URL = `https://wa.me/${WHATSAPP_NUMBER}?text=Ol%C3%A1!%20Tenho%20uma%20d%C3%BAvida%20sobre%20o%20prazo%20de%20entrega.`;

// Entrega Programada (Pex): desde R$ 15 na capital e Grande SP, grátis acima de R$ 200.
const PONTOS = ['Capital e Grande SP · desde R$ 15', 'Grátis acima de R$ 200', 'Campinas e região em 2 dias'];

// O que mais se busca no site. Um toque já busca na vitrine.
const ATALHOS = [
  { rotulo: 'Tabaco', termo: 'tabaco' },
  { rotulo: 'Seda', termo: 'seda' },
  { rotulo: 'Piteira', termo: 'piteira' },
  { rotulo: 'Essência', termo: 'essencia' },
  { rotulo: 'Isqueiro', termo: 'isqueiro' },
  { rotulo: 'Kits', termo: 'kit' },
];

export default function HeroSection() {
  const clube = useClubeRegras();
  const [termo, setTermo] = useState('');

  function buscar(e: React.FormEvent) {
    e.preventDefault();
    buscarNaVitrine(termo);
  }

  return (
    <section className={styles.hero} aria-label="Bem-vindo à Alpha Galerie">
      <img
        className={styles.arte}
        src={heroArte}
        alt=""
        aria-hidden="true"
        decoding="async"
      />
      <div className={styles.veu} aria-hidden="true" />

      <div className={styles.inner}>
        <div className={styles.copy}>
          <p className={styles.eyebrow}>Alpha Galerie · Alphaville · Desde 2014</p>

          <h1 className={styles.title}>
            <span className={styles.light}>A referência</span>
            <br />
            em <em>tabacaria</em>
            <br />
            de Alphaville.
          </h1>

          {/* Quem chega sabendo o que quer não precisa rolar a vitrine. */}
          <form className={styles.busca} role="search" onSubmit={buscar}>
            <label htmlFor="hero-busca" className={styles.buscaLabel}>O que você procura?</label>
            <div className={styles.buscaCampo}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                id="hero-busca"
                type="search"
                enterKeyHint="search"
                value={termo}
                onChange={(e) => setTermo(e.target.value)}
                placeholder="Tabaco, seda, essência…"
                autoComplete="off"
              />
              <button type="submit">Buscar</button>
            </div>
            <div className={styles.atalhos}>
              {ATALHOS.map((a) => (
                <button key={a.termo} type="button" onClick={() => buscarNaVitrine(a.termo)}>
                  {a.rotulo}
                </button>
              ))}
            </div>
          </form>

          <p className={styles.lead}>
            Headshop, charutaria, arguile e lifestyle reunidos numa curadoria
            que respeita quem entende.{' '}
            <strong className={styles.leadEmphasis}>
              Atendimento direto, curadoria de verdade.
            </strong>
          </p>

          <div className={styles.ctaRow}>
            <a href="#produtos" className={styles.cta}>
              <span>Explorar Vitrine</span>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </a>

            {/* Só aparece com o Alpha Club no ar (ligado na retaguarda). */}
            {clube?.ativo && (
              <a href="#clube" className={styles.cashbackTag}>
                <span className={styles.cashbackSelo} aria-hidden="true">✦</span>
                <span className={styles.cashbackTexto}>
                  <strong>Ganhe cashback na sua compra</strong>
                  <small>{clube.nome} · {percentualDeVolta(clube).toLocaleString('pt-BR')}% de volta em pontos</small>
                </span>
              </a>
            )}
          </div>

          <div className={styles.meta} aria-label="Números da Alpha Galerie">
            <div>
              <div className={styles.metaNum}>10+</div>
              <div className={styles.metaLabel}>Anos no mercado</div>
            </div>
            <div>
              <div className={styles.metaNum}>500+</div>
              <div className={styles.metaLabel}>Produtos curados</div>
            </div>
            <div>
              <div className={styles.metaNum}>100%</div>
              <div className={styles.metaLabel}>Atendimento direto</div>
            </div>
          </div>
        </div>

        <aside className={styles.entrega} aria-labelledby="entrega-titulo">
          <p className={styles.entregaEyebrow}>Entrega</p>

          <h2 className={styles.entregaTitulo} id="entrega-titulo">
            Pediu até {PEX_CORTE_TEXTO}, <em>chega hoje</em>.
          </h2>

          <p className={styles.entregaLead}>
            Entrega Programada de segunda a sábado. Com pressa? Motoboy em Alphaville e região.
          </p>

          <ul className={styles.entregaPontos}>
            {PONTOS.map((ponto) => (
              <li key={ponto}>{ponto}</li>
            ))}
          </ul>

          <a className={styles.entregaLink} href={WA_URL} target="_blank" rel="noopener noreferrer">
            Precisa para uma data? Fale no WhatsApp
            <span aria-hidden="true">→</span>
          </a>
        </aside>
      </div>
    </section>
  );
}
