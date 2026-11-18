import { useClubeRegras } from '../hooks/useClube';
import { percentualDeVolta } from '../lib/clube';
import { CAMPANHA, campanhaNoAr } from '../lib/campanha';
import { FRETE_NACIONAL, PEX_CORTE_TEXTO } from '../lib/frete';
import styles from './BlackNovemberSection.module.css';

// Faixa da campanha logo abaixo do topo: o que o cliente ganha comprando na
// Alpha, em vez de "tudo mais barato". Some sozinha depois do fim.
export default function BlackNovemberSection() {
  const clube = useClubeRegras();
  if (!campanhaNoAr()) return null;

  const volta = clube?.ativo ? percentualDeVolta(clube).toLocaleString('pt-BR') : null;

  const beneficios = [
    volta && { destaque: `${volta}%`, texto: 'de volta em pontos no Alpha Club' },
    { destaque: `R$ ${FRETE_NACIONAL}`, texto: 'frete fixo para todo o Brasil' },
    { destaque: 'Hoje', texto: `pediu até ${PEX_CORTE_TEXTO}, chega hoje na Grande SP` },
  ].filter(Boolean) as { destaque: string; texto: string }[];

  return (
    <section className={styles.section} aria-labelledby="black-titulo">
      <div className={styles.inner}>
        <div className={styles.copy}>
          <p className={styles.eyebrow}>Só até {CAMPANHA.fimTexto}</p>
          <h2 className={styles.title} id="black-titulo">
            BLACK <span>NOVEMBER</span> ALPHA
          </h2>
          <p className={styles.sub}>
            Mesmo produto, mais vantagem: cashback, frete fixo e entrega no mesmo dia.
          </p>
          <div className={styles.ctas}>
            <a href="#kits" className={styles.cta}>Ver os kits</a>
            {volta && (
              <a href="#clube" className={styles.ctaGhost}>Entrar no Alpha Club</a>
            )}
          </div>
        </div>

        <ul className={styles.beneficios}>
          {beneficios.map((b) => (
            <li key={b.texto}>
              <strong>{b.destaque}</strong>
              <span>{b.texto}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
