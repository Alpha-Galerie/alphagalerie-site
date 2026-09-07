import styles from './HeroSection.module.css';

const WHATSAPP_NUMBER = import.meta.env.VITE_WHATSAPP_NUMBER as string;
const WA_URL = `https://wa.me/${WHATSAPP_NUMBER}?text=Ol%C3%A1!%20Tenho%20uma%20d%C3%BAvida%20sobre%20o%20prazo%20de%20entrega.`;

const PONTOS = ['Em até 24h', 'Todos os dias', 'Alphaville e região'];

export default function HeroSection() {
  return (
    <section className={styles.hero} aria-label="Bem-vindo à Alpha Galerie">
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

          <p className={styles.lead}>
            Headshop, charutaria, arguile e lifestyle reunidos numa curadoria
            que respeita quem entende.{' '}
            <strong className={styles.leadEmphasis}>
              Atendimento direto, curadoria de verdade.
            </strong>
          </p>

          <a href="#produtos" className={styles.cta}>
            <span>Explorar Vitrine</span>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </a>

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
            Peça com <em>antecedência</em>.
          </h2>

          <p className={styles.entregaLead}>
            Não é entrega expressa. Cada pedido sai por ordem de chegada.
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
