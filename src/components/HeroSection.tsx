import styles from './HeroSection.module.css';

const WHATSAPP_NUMBER = import.meta.env.VITE_WHATSAPP_NUMBER as string;
const WA_URL = `https://wa.me/${WHATSAPP_NUMBER}?text=Ol%C3%A1!%20Tenho%20uma%20d%C3%BAvida%20sobre%20o%20prazo%20de%20entrega.`;

const ETAPAS = [
  {
    num: '01',
    titulo: 'Por ordem de chegada',
    texto:
      'Seu pedido entra na fila no momento em que o pagamento é confirmado. Quem pede antes, recebe antes.',
  },
  {
    num: '02',
    titulo: 'Saídas em lote, com parceiro',
    texto:
      'As entregas são agrupadas e despachadas por motoboy parceiro, que tem janela própria de coleta. Não sai um motoboy por pedido.',
  },
  {
    num: '03',
    titulo: 'Todos os dias, em até 24h',
    texto:
      'Entregamos todos os dias. O prazo é de até 24h após a confirmação — na maioria das vezes chega bem antes.',
  },
];

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
          <p className={styles.entregaEyebrow}>Entrega · Nova logística</p>

          <h2 className={styles.entregaTitulo} id="entrega-titulo">
            Antecipe seu <em>pedido</em>.
          </h2>

          <p className={styles.entregaLead}>
            Não trabalhamos com entrega expressa. Cada pedido é separado,
            conferido e despachado com cuidado — na ordem em que chega.
          </p>

          <ol className={styles.entregaLista}>
            {ETAPAS.map((etapa) => (
              <li key={etapa.num} className={styles.entregaItem}>
                <span className={styles.entregaNum} aria-hidden="true">{etapa.num}</span>
                <div>
                  <p className={styles.entregaItemTitulo}>{etapa.titulo}</p>
                  <p className={styles.entregaItemTexto}>{etapa.texto}</p>
                </div>
              </li>
            ))}
          </ol>

          <p className={styles.entregaNota}>
            Precisa para uma data específica?{' '}
            <a href={WA_URL} target="_blank" rel="noopener noreferrer">
              Fale com a gente antes de fechar o pedido
            </a>
            .
          </p>
        </aside>
      </div>
    </section>
  );
}
