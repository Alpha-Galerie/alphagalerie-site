import styles from './AnnouncementBar.module.css';

const ITEMS = [
  'Alphaville · Barueri · SP',
  'Atendimento via WhatsApp',
  '+10 anos no mercado',
  'Headshop · Charutaria · Arguile · Lifestyle',
  'Entregas por ordem de chegada · peça com antecedência',
];

// Duplicar para que o marquee seja contínuo (sem gap visível no loop)
const ALL = [...ITEMS, ...ITEMS];

export default function AnnouncementBar() {
  return (
    <div className={styles.bar} aria-hidden="true">
      <div className={styles.track}>
        {ALL.map((item, i) => (
          <span key={i}>{item}</span>
        ))}
      </div>
    </div>
  );
}
