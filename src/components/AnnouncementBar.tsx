import { useClubeRegras } from '../hooks/useClube';
import { percentualDeVolta } from '../lib/clube';
import styles from './AnnouncementBar.module.css';

const ITEMS = [
  'Alphaville · Barueri · SP',
  'Atendimento via WhatsApp',
  '+10 anos no mercado',
  'Headshop · Charutaria · Arguile · Lifestyle',
  'Entregas por ordem de chegada · peça com antecedência',
];

export default function AnnouncementBar() {
  const clube = useClubeRegras();
  const itens = clube?.ativo
    ? [`${clube.nome}: ${percentualDeVolta(clube).toLocaleString('pt-BR')}% de volta em pontos em toda compra`, ...ITEMS]
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
