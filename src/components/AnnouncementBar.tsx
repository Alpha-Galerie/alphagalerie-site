import { useClubeRegras } from '../hooks/useClube';
import { percentualDeVolta } from '../lib/clube';
import { PEX_CORTE_TEXTO } from '../lib/frete';
import styles from './AnnouncementBar.module.css';

const ITEMS = [
  `Pediu até ${PEX_CORTE_TEXTO}, chega hoje na capital e na região`,
  'Entrega R$ 15 na capital e Grande SP · grátis acima de R$ 200',
  'Atendimento via WhatsApp',
  'Headshop · Charutaria · Arguile · Lifestyle',
  'Alphaville · Barueri · SP · +10 anos no mercado',
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
