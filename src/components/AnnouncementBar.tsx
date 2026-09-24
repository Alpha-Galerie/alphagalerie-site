import { useCashbackRegras } from '../hooks/useCashback';
import { descreverPercentual } from '../lib/cashback';
import styles from './AnnouncementBar.module.css';

const ITEMS = [
  'Alphaville · Barueri · SP',
  'Atendimento via WhatsApp',
  '+10 anos no mercado',
  'Headshop · Charutaria · Arguile · Lifestyle',
  'Entregas por ordem de chegada · peça com antecedência',
];

export default function AnnouncementBar() {
  const cashback = useCashbackRegras();
  const itens = cashback
    ? [`Cashback: ${descreverPercentual(cashback)} · ${cashback.validadeDias} dias para usar`, ...ITEMS]
    : ITEMS;
  // Duplicar para que o marquee seja contínuo (sem gap visível no loop)
  const ALL = [...itens, ...itens];

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
